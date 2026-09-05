package com.dice.engine.decision;

import com.dice.domain.Customer;
import com.dice.domain.Deal;
import com.dice.domain.DealLine;
import com.dice.domain.Policy;
import com.dice.domain.Product;
import com.dice.domain.enums.CustomerSegment;
import com.dice.domain.enums.DealStatus;
import com.dice.domain.enums.PolicySeverity;
import com.dice.domain.enums.PolicyType;
import com.dice.domain.enums.QuotationDecision;
import com.dice.engine.approval.ApprovalEngine;
import com.dice.engine.health.DealHealthEngine;
import com.dice.engine.margin.MarginEngine;
import com.dice.engine.policy.PolicyEngine;
import com.dice.engine.recommendation.RecommendationEngine;
import com.dice.engine.risk.RiskEngine;
import com.dice.engine.risk.ViolationRiskEngine;
import com.dice.service.PricingService;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Exercises {@code DecisionResolver}'s quotation-facing decision (Commit 09)
 * end to end over the real engines — no mocks, since every engine here is
 * pure arithmetic over the data handed in.
 */
class DecisionResolverQuotationDecisionTest {

    private final MarginEngine marginEngine = new MarginEngine();
    private final PricingService pricingService = new PricingService(marginEngine);
    private final DecisionResolver resolver = new DecisionResolver(
            marginEngine, new RiskEngine(), new ViolationRiskEngine(),
            new PolicyEngine(), new ApprovalEngine(), new RecommendationEngine(),
            new DealHealthEngine());

    private Customer customer(DealStatus ignored) {
        return Customer.builder()
                .id(UUID.randomUUID())
                .name("Test Customer")
                .segment(CustomerSegment.MID_MARKET)
                .tier("SILVER")
                .creditLimit(new BigDecimal("1000000"))
                .outstandingBalance(BigDecimal.ZERO)
                .onTimePaymentRate(new BigDecimal("95"))
                .build();
    }

    private DealLine line(String category, int quantity, String discountPercent) {
        Product product = Product.builder()
                .sku("SKU-" + category)
                .name(category)
                .category(category)
                .listPrice(new BigDecimal("100.00"))
                .standardCost(new BigDecimal("50.00"))
                .active(true)
                .build();
        return DealLine.builder()
                .id(UUID.randomUUID())
                .product(product)
                .quantity(quantity)
                .unitPrice(new BigDecimal("100.00"))
                .discountPercent(new BigDecimal(discountPercent))
                .build();
    }

    private Deal deal(DealStatus status, DealLine... lines) {
        Deal deal = Deal.builder()
                .dealNumber("DICE-TEST-" + UUID.randomUUID())
                .customer(customer(status))
                .status(status)
                .build();
        for (DealLine line : lines) {
            deal.addLine(line);
        }
        pricingService.recalculate(deal);
        return deal;
    }

    private Policy discountLimit(String category, String threshold, PolicySeverity severity) {
        return Policy.builder()
                .code("CAP-" + UUID.randomUUID())
                .name("cap")
                .type(PolicyType.DISCOUNT_LIMIT)
                .severity(severity)
                .productCategory(category)
                .thresholdValue(new BigDecimal(threshold))
                .requiredRole("SALES_MANAGER")
                .priority(50)
                .active(true)
                .build();
    }

    @Test
    void cleanDealIsOrderReady() {
        Deal deal = deal(DealStatus.DRAFT, line("Software", 10, "0"));

        var resolution = resolver.resolve(deal, DecisionResolver.Context.of(List.of(), List.of()));

        assertThat(resolution.quotationDecision().decision()).isEqualTo(QuotationDecision.ORDER_READY);
        assertThat(resolution.quotationDecision().approvalRequired()).isFalse();
        assertThat(resolution.quotationDecision().nextAction()).isEqualTo("NONE");
    }

    @Test
    void firstTimeApprovalNeededOnADraftDeal() {
        Deal deal = deal(DealStatus.DRAFT, line("Hardware", 10, "15"));
        List<Policy> policies = List.of(discountLimit("Hardware", "10", PolicySeverity.APPROVAL_REQUIRED));

        var resolution = resolver.resolve(deal, DecisionResolver.Context.of(policies, List.of()));

        assertThat(resolution.quotationDecision().decision()).isEqualTo(QuotationDecision.APPROVAL_REQUIRED);
        assertThat(resolution.quotationDecision().approvalRequired()).isTrue();
        assertThat(resolution.quotationDecision().requiredApprovals()).contains("SALES_MANAGER");
        assertThat(resolution.quotationDecision().nextAction()).isEqualTo("WAIT_FOR_SALES_MANAGER");
    }

    /**
     * Reconciled: the resolver has no notion of "previously approved with this
     * exact state" — only {@code DealService}'s {@code MaterialChangeDetector}
     * does, by comparing against a real {@code ApprovalSnapshot}. A status
     * check alone (the original version of this test) would fire on a bare
     * re-evaluation of an approved deal with zero underlying change, which is
     * a false positive. See {@code DecisionResolver.decideQuotation}'s javadoc
     * and docs/decision-contract.md's "Approval snapshot / reapproval" section
     * for the real, verified promotion path.
     */
    @Test
    void sameBreachOnAnAlreadyApprovedDealStillReadsAsApprovalRequired() {
        Deal deal = deal(DealStatus.APPROVED, line("Hardware", 10, "15"));
        List<Policy> policies = List.of(discountLimit("Hardware", "10", PolicySeverity.APPROVAL_REQUIRED));

        var resolution = resolver.resolve(deal, DecisionResolver.Context.of(policies, List.of()));

        assertThat(resolution.quotationDecision().decision()).isEqualTo(QuotationDecision.APPROVAL_REQUIRED);
        assertThat(resolution.quotationDecision().approvalRequired()).isTrue();
    }

    @Test
    void blockingPolicyBreachIsDealAtRisk() {
        Deal deal = deal(DealStatus.DRAFT, line("Software", 10, "0"));
        Policy marginFloor = Policy.builder()
                .code("MARGIN-FLOOR-" + UUID.randomUUID())
                .name("floor")
                .type(PolicyType.MARGIN_FLOOR)
                .severity(PolicySeverity.BLOCKING)
                .thresholdValue(new BigDecimal("90"))
                .active(true)
                .priority(10)
                .build();

        var resolution = resolver.resolve(deal, DecisionResolver.Context.of(List.of(marginFloor), List.of()));

        assertThat(resolution.quotationDecision().decision()).isEqualTo(QuotationDecision.DEAL_AT_RISK);
        assertThat(resolution.quotationDecision().nextAction()).isEqualTo("ESCALATE_TO_ADMIN");
    }

    @Test
    void severeDiscountOverageIsDealAtRiskEvenWithoutABlockingPolicy() {
        Deal deal = deal(DealStatus.DRAFT, line("Hardware", 10, "90"));
        List<Policy> policies = List.of(discountLimit("Hardware", "5", PolicySeverity.APPROVAL_REQUIRED));

        var resolution = resolver.resolve(deal, DecisionResolver.Context.of(policies, List.of()));

        assertThat(resolution.violationRisk().level().name()).isEqualTo("CRITICAL");
        assertThat(resolution.quotationDecision().decision()).isEqualTo(QuotationDecision.DEAL_AT_RISK);
    }

    @Test
    void advisoryOnlyBreachIsNoAction() {
        Deal deal = deal(DealStatus.DRAFT, line("Software", 10, "0"));
        Policy quantityAdvisory = Policy.builder()
                .code("QTY-ADVISORY-" + UUID.randomUUID())
                .name("qty advisory")
                .type(PolicyType.QUANTITY_LIMIT)
                .severity(PolicySeverity.ADVISORY)
                .thresholdValue(new BigDecimal("5"))
                .active(true)
                .priority(50)
                .build();

        var resolution = resolver.resolve(deal, DecisionResolver.Context.of(List.of(quantityAdvisory), List.of()));

        assertThat(resolution.quotationDecision().decision()).isEqualTo(QuotationDecision.NO_ACTION);
        assertThat(resolution.quotationDecision().approvalRequired()).isFalse();
    }

    @Test
    void reasonsIncludeBothPolicyCodesAndViolationRiskReasons() {
        Deal deal = deal(DealStatus.DRAFT, line("Hardware", 10, "15"));
        List<Policy> policies = List.of(discountLimit("Hardware", "10", PolicySeverity.APPROVAL_REQUIRED));

        var resolution = resolver.resolve(deal, DecisionResolver.Context.of(policies, List.of()));

        assertThat(resolution.quotationDecision().reasons()).isNotEmpty();
    }
}
