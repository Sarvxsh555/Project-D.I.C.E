package com.dice.service;

import com.dice.domain.Deal;
import com.dice.domain.enums.BillingStatus;
import com.dice.domain.enums.DealStatus;
import com.dice.engine.billing.BillingEngine;
import com.dice.events.DealEvent;
import com.dice.events.EventPublisher;
import com.dice.repository.DealRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

/**
 * Produces invoice drafts from fulfilled deals.
 *
 * <p>DICE does not post to a ledger — it builds the schedule and hands it to
 * Odoo. {@code BillingStatus} on the deal is the local mirror of what happened
 * over there.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class BillingService {

    private final DealRepository dealRepository;
    private final BillingEngine billingEngine;
    private final EventPublisher eventPublisher;

    /** The schedule that would be raised, without changing anything. */
    @Transactional(readOnly = true)
    public BillingEngine.BillingSchedule preview(UUID dealId) {
        return billingEngine.build(requireDeal(dealId));
    }

    /**
     * Drafts the invoice and flips the deal's billing status.
     *
     * <p>Guarded on fulfillment: billing for goods that never shipped is the kind
     * of thing auditors ask pointed questions about.
     */
    public BillingEngine.BillingSchedule draftInvoice(UUID dealId, String actor) {
        Deal deal = requireDeal(dealId);

        if (deal.getStatus() != DealStatus.FULFILLED && deal.getStatus() != DealStatus.FULFILLING) {
            throw new IllegalStateException(
                    "Deal %s is %s; nothing has shipped to invoice"
                            .formatted(deal.getDealNumber(), deal.getStatus()));
        }
        if (deal.getBillingStatus() != BillingStatus.NOT_INVOICED) {
            throw new IllegalStateException(
                    "Deal %s is already %s".formatted(deal.getDealNumber(), deal.getBillingStatus()));
        }

        var schedule = billingEngine.build(deal);

        deal.setBillingStatus(BillingStatus.DRAFT_INVOICE);
        dealRepository.save(deal);

        eventPublisher.publish(DealEvent.Type.INVOICE_DRAFTED, dealId, actor,
                Map.of("installments", schedule.installments().size(),
                        "totalAmount", schedule.totalAmount()));

        return schedule;
    }

    /** Called when Odoo confirms the invoice was posted. */
    public Deal markInvoiced(UUID dealId, String actor) {
        Deal deal = requireDeal(dealId);
        deal.setBillingStatus(BillingStatus.INVOICED);
        deal.setStatus(DealStatus.INVOICED);
        return dealRepository.save(deal);
    }

    /** Called when payment lands. */
    public Deal markPaid(UUID dealId, String actor) {
        Deal deal = requireDeal(dealId);
        deal.setBillingStatus(BillingStatus.PAID);
        return dealRepository.save(deal);
    }

    private Deal requireDeal(UUID dealId) {
        return dealRepository.findWithLinesById(dealId)
                .orElseThrow(() -> new IllegalArgumentException("No deal with id " + dealId));
    }
}
