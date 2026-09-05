package com.dice.engine.billing;

import com.dice.domain.Deal;
import com.dice.domain.DealLine;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Builds the invoice schedule for a confirmed deal.
 *
 * <p>Large deals are milestone-billed rather than invoiced in one go; the split
 * below (40/40/20) is the house default and the thing to make configurable when
 * real billing terms arrive.
 */
@Component
public class BillingEngine {

    /** Above this value the deal is billed in milestones. */
    private static final BigDecimal MILESTONE_THRESHOLD = BigDecimal.valueOf(100_000);

    private static final List<MilestoneSpec> MILESTONES = List.of(
            new MilestoneSpec("DEPOSIT", "Deposit on order confirmation", BigDecimal.valueOf(0.40), 0),
            new MilestoneSpec("SHIPMENT", "On shipment", BigDecimal.valueOf(0.40), 30),
            new MilestoneSpec("ACCEPTANCE", "On acceptance", BigDecimal.valueOf(0.20), 60));

    public BillingSchedule build(Deal deal) {
        BigDecimal total = deal.getTotalAmount() == null ? BigDecimal.ZERO : deal.getTotalAmount();
        int termsDays = deal.getCustomer().getPaymentTermsDays() == null
                ? 30 : deal.getCustomer().getPaymentTermsDays();

        List<Installment> installments = total.compareTo(MILESTONE_THRESHOLD) > 0
                ? milestoneInstallments(total, termsDays)
                : List.of(singleInstallment(total, termsDays));

        return new BillingSchedule(
                deal.getId(),
                deal.getCurrency(),
                total,
                termsDays,
                installments,
                buildLineItems(deal));
    }

    private Installment singleInstallment(BigDecimal total, int termsDays) {
        return new Installment("FULL", "Full amount on invoice", total,
                LocalDate.now().plusDays(termsDays));
    }

    /**
     * Splits by the configured percentages, assigning any rounding remainder to
     * the final installment so the parts always sum to the total.
     */
    private List<Installment> milestoneInstallments(BigDecimal total, int termsDays) {
        List<Installment> out = new ArrayList<>();
        BigDecimal allocated = BigDecimal.ZERO;

        for (int i = 0; i < MILESTONES.size(); i++) {
            MilestoneSpec spec = MILESTONES.get(i);
            boolean last = i == MILESTONES.size() - 1;
            BigDecimal amount = last
                    ? total.subtract(allocated)
                    : total.multiply(spec.share()).setScale(2, RoundingMode.HALF_UP);
            allocated = allocated.add(amount);

            out.add(new Installment(spec.code(), spec.label(), amount,
                    LocalDate.now().plusDays((long) spec.offsetDays() + termsDays)));
        }
        return out;
    }

    private List<LineItem> buildLineItems(Deal deal) {
        List<LineItem> items = new ArrayList<>();
        for (DealLine line : deal.getLines()) {
            items.add(new LineItem(
                    line.getProduct().getSku(),
                    line.getProduct().getName(),
                    line.getQuantity(),
                    line.netUnitPrice(),
                    line.netUnitPrice().multiply(BigDecimal.valueOf(line.getQuantity()))
                            .setScale(2, RoundingMode.HALF_UP)));
        }
        return items;
    }

    private record MilestoneSpec(String code, String label, BigDecimal share, int offsetDays) {
    }

    public record BillingSchedule(
            java.util.UUID dealId,
            String currency,
            BigDecimal totalAmount,
            int paymentTermsDays,
            List<Installment> installments,
            List<LineItem> lineItems) {

        public boolean isMilestoneBilled() {
            return installments.size() > 1;
        }
    }

    public record Installment(String code, String label, BigDecimal amount, LocalDate dueDate) {
    }

    public record LineItem(String sku, String description, int quantity,
                           BigDecimal unitPrice, BigDecimal amount) {
    }
}
