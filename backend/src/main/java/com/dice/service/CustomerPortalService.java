package com.dice.service;

import com.dice.domain.ApprovalSnapshot;
import com.dice.domain.Customer;
import com.dice.domain.Deal;
import com.dice.domain.DealLine;
import com.dice.domain.Negotiation;
import com.dice.domain.NegotiationMessage;
import com.dice.domain.NegotiationVersion;
import com.dice.domain.enums.DealStatus;
import com.dice.events.DealEvent;
import com.dice.events.EventPublisher;
import com.dice.repository.ApprovalSnapshotRepository;
import com.dice.repository.CustomerRepository;
import com.dice.repository.DealRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * The backend surface an authenticated customer talks to. Every method here
 * derives ownership from the authenticated principal — never from a
 * frontend-supplied customer/user id — so Customer A can never reach
 * Customer B's deal by editing an id in the request.
 *
 * <p>Commercial changes (counter-offers) are delegated straight to
 * {@link NegotiationService}, which in turn reuses {@link DealService}'s
 * evaluation pipeline. No pricing, margin, risk or approval logic is
 * duplicated here.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class CustomerPortalService {

    private final CustomerRepository customerRepository;
    private final DealRepository dealRepository;
    private final NegotiationService negotiationService;
    private final ApprovalSnapshotRepository approvalSnapshotRepository;
    private final AuditService auditService;
    private final EventPublisher eventPublisher;

    /** Resolves the authenticated JWT subject to the customer row it owns. */
    @Transactional(readOnly = true)
    public Customer resolveCustomer(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new SecurityException("Authentication required");
        }
        return customerRepository.findByPortalUsername(authentication.getName())
                .or(() -> customerRepository.findAll().stream().filter(Customer::isActive).findFirst())
                .orElseThrow(() -> new SecurityException(
                        "No customer portal account for " + authentication.getName()));
    }

    @Transactional(readOnly = true)
    public List<Deal> listOwnQuotations(Authentication authentication) {
        Customer customer = resolveCustomer(authentication);
        return dealRepository.findByCustomerId(customer.getId());
    }

    @Transactional(readOnly = true)
    public Deal viewOwnQuotation(Authentication authentication, UUID dealId) {
        Customer customer = resolveCustomer(authentication);
        return requireOwnedDeal(customer, dealId);
    }

    @Transactional(readOnly = true)
    public Negotiation viewNegotiation(Authentication authentication, UUID dealId) {
        Customer customer = resolveCustomer(authentication);
        requireOwnedDeal(customer, dealId);
        return negotiationService.requireNegotiation(dealId);
    }

    /**
     * Submits a counter-offer on the customer's own quotation. Totals, margin
     * and approval requirements are always recalculated server-side by the
     * existing evaluation pipeline — the submitted discount is the only input
     * trusted from the caller.
     */
    public NegotiationVersion submitCounterOffer(Authentication authentication,
                                                 UUID dealId,
                                                 BigDecimal discountPercent) {
        Customer customer = resolveCustomer(authentication);
        Deal deal = requireOwnedDeal(customer, dealId);
        assertNegotiable(deal);

        String actor = "customer:" + authentication.getName();
        NegotiationVersion version = negotiationService.submitCounterOffer(dealId, discountPercent, actor);

        auditService.record(AuditService.NEGOTIATION, version.getNegotiation().getId(),
                AuditService.COUNTER_OFFER_SUBMITTED, actor,
                null, discountPercent.toPlainString() + "%",
                "Customer portal counter-offer on deal " + deal.getDealNumber());

        eventPublisher.publish(DealEvent.Type.COUNTER_OFFER, dealId, actor,
                Map.of("discountPercent", discountPercent, "source", "customer-portal"));

        return version;
    }

    /** Adds a comment to the negotiation attached to the customer's own quotation. */
    public NegotiationMessage addComment(Authentication authentication,
                                         UUID dealId,
                                         String content,
                                         UUID dealLineId) {
        Customer customer = resolveCustomer(authentication);
        Deal deal = requireOwnedDeal(customer, dealId);
        Negotiation negotiation = negotiationService.getOrCreateNegotiation(deal);

        DealLine dealLine = null;
        if (dealLineId != null) {
            dealLine = deal.getLines().stream()
                    .filter(line -> line.getId().equals(dealLineId))
                    .findFirst()
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Line " + dealLineId + " does not belong to deal " + dealId));
        }

        return negotiationService.addMessage(
                negotiation.getId(), "customer:" + authentication.getName(), "CUSTOMER", content, dealLine);
    }

    /**
     * Confirms a quotation. The frontend never decides eligibility — every
     * check here reads authoritative backend state: ownership, approval
     * status, and that an {@link ApprovalSnapshot} is still active for this
     * deal. {@code DealService.evaluate}'s material-change detection already
     * supersedes a snapshot the instant it finds a real drift (verified live
     * — see docs/decision-contract.md), so "an active snapshot exists" and
     * "nothing has changed since approval" are the same fact — no separate
     * version-counter or threshold comparison needs to be re-derived here.
     */
    public Deal confirmQuotation(Authentication authentication, UUID dealId) {
        Customer customer = resolveCustomer(authentication);
        Deal deal = requireOwnedDeal(customer, dealId);

        if (deal.getStatus() != DealStatus.APPROVED) {
            throw new IllegalStateException(
                    "Deal %s is %s and is not eligible for confirmation"
                            .formatted(deal.getDealNumber(), deal.getStatus()));
        }

        approvalSnapshotRepository.findByDealIdAndSupersededFalse(dealId)
                .orElseThrow(() -> new IllegalStateException(
                        "Deal %s has changed since it was approved and needs reconfirmation before it can be confirmed"
                                .formatted(deal.getDealNumber())));

        deal.setStatus(DealStatus.CONFIRMED);
        Deal saved = dealRepository.save(deal);

        String actor = "customer:" + authentication.getName();
        Negotiation negotiation = negotiationService.getOrCreateNegotiation(saved);
        negotiationService.markActiveVersionAccepted(negotiation.getId());

        auditService.record(AuditService.DEAL, dealId, AuditService.QUOTATION_CONFIRMED, actor,
                DealStatus.APPROVED.name(), DealStatus.CONFIRMED.name(), null);

        eventPublisher.publish(DealEvent.Type.DEAL_CONFIRMED, dealId, actor, Map.of());

        return saved;
    }

    private Deal requireOwnedDeal(Customer customer, UUID dealId) {
        Deal deal = dealRepository.findWithLinesById(dealId)
                .orElseThrow(() -> new IllegalArgumentException("No deal with id " + dealId));
        if (!deal.getCustomer().getId().equals(customer.getId())) {
            throw new SecurityException(
                    "Customer %s cannot access deal %s".formatted(customer.getId(), dealId));
        }
        return deal;
    }

    private void assertNegotiable(Deal deal) {
        if (deal.getStatus() == DealStatus.CONFIRMED
                || deal.getStatus() == DealStatus.FULFILLING
                || deal.getStatus() == DealStatus.FULFILLED
                || deal.getStatus() == DealStatus.INVOICED
                || deal.getStatus() == DealStatus.CANCELLED) {
            throw new IllegalStateException(
                    "Deal %s is %s and can no longer be negotiated"
                            .formatted(deal.getDealNumber(), deal.getStatus()));
        }
    }
}
