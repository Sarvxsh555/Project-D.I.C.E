package com.dice.service;

import com.dice.domain.Customer;
import com.dice.domain.Deal;
import com.dice.domain.DealLine;
import com.dice.domain.Negotiation;
import com.dice.domain.NegotiationVersion;
import com.dice.domain.Product;
import com.dice.domain.enums.DealStatus;
import com.dice.domain.enums.NegotiationVersionStatus;
import com.dice.engine.decision.DecisionResolver;
import com.dice.events.EventPublisher;
import com.dice.repository.DealRepository;
import com.dice.repository.NegotiationMessageRepository;
import com.dice.repository.NegotiationRepository;
import com.dice.repository.NegotiationVersionRepository;
import com.dice.repository.PolicyRepository;
import com.dice.repository.ProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Commits 15-16 — negotiation versioning + re-evaluation integration.
 *
 * <p>NegotiationService is exercised with {@link DealService} mocked: the
 * evaluation pipeline itself (material-change detection, approval
 * invalidation, the engines) is already covered by
 * {@link EvaluationPipelineTest} and {@link ApprovalSnapshotTest} — these
 * tests verify only that a counter-offer correctly turns whatever
 * DealService produces into an immutable, correctly-numbered version history.
 */
@ExtendWith(MockitoExtension.class)
class NegotiationServiceTest {

    @Mock private DealRepository dealRepository;
    @Mock private PolicyRepository policyRepository;
    @Mock private ProductRepository productRepository;
    @Mock private DealService dealService;
    @Mock private PricingService pricingService;
    @Mock private DecisionResolver decisionResolver;
    @Mock private EventPublisher eventPublisher;
    @Mock private NegotiationRepository negotiationRepository;
    @Mock private NegotiationVersionRepository negotiationVersionRepository;
    @Mock private NegotiationMessageRepository negotiationMessageRepository;
    @Mock private AuditService auditService;

    private NegotiationService service;
    private Deal deal;
    private Customer customer;

    @BeforeEach
    void setUp() {
        service = new NegotiationService(dealRepository, policyRepository, productRepository,
                dealService, pricingService, decisionResolver, eventPublisher,
                negotiationRepository, negotiationVersionRepository, negotiationMessageRepository,
                auditService);

        customer = Customer.builder().id(UUID.randomUUID()).name("Acme Corp").build();
        deal = dealWithDiscount(BigDecimal.valueOf(12), DealStatus.APPROVED);

        lenient().when(dealService.require(deal.getId())).thenReturn(deal);
        lenient().when(negotiationVersionRepository.save(any(NegotiationVersion.class)))
                .thenAnswer(inv -> {
                    NegotiationVersion v = inv.getArgument(0);
                    if (v.getId() == null) v.setId(UUID.randomUUID());
                    return v;
                });
        lenient().when(negotiationRepository.save(any(Negotiation.class)))
                .thenAnswer(inv -> {
                    Negotiation n = inv.getArgument(0);
                    if (n.getId() == null) n.setId(UUID.randomUUID());
                    return n;
                });
    }

    private Deal dealWithDiscount(BigDecimal discountPercent, DealStatus status) {
        Product product = Product.builder()
                .id(UUID.randomUUID()).sku("SKU-1").name("Widget")
                .listPrice(BigDecimal.valueOf(100)).standardCost(BigDecimal.valueOf(50))
                .build();
        DealLine line = DealLine.builder()
                .id(UUID.randomUUID()).product(product).quantity(10)
                .unitPrice(BigDecimal.valueOf(100)).discountPercent(discountPercent)
                .lineTotal(BigDecimal.valueOf(880))
                .build();
        Deal d = Deal.builder()
                .id(UUID.randomUUID()).dealNumber("DICE-000001")
                .customer(customer).status(status)
                .subtotal(BigDecimal.valueOf(1000))
                .discountAmount(BigDecimal.valueOf(1000).multiply(discountPercent).divide(BigDecimal.valueOf(100)))
                .totalAmount(BigDecimal.valueOf(1000).subtract(
                        BigDecimal.valueOf(1000).multiply(discountPercent).divide(BigDecimal.valueOf(100))))
                .marginPercent(BigDecimal.valueOf(30))
                .lines(new ArrayList<>(List.of(line)))
                .build();
        line.setDeal(d);
        return d;
    }

    // ------------------------------------------------------------------
    // Negotiation creation
    // ------------------------------------------------------------------

    @Test
    void getOrCreateNegotiationCreatesOneWhenNoneExists() {
        when(negotiationRepository.findByDealId(deal.getId())).thenReturn(Optional.empty());

        Negotiation negotiation = service.getOrCreateNegotiation(deal);

        assertThat(negotiation.getDeal()).isEqualTo(deal);
        assertThat(negotiation.getCustomer()).isEqualTo(customer);
        verify(negotiationRepository).save(any(Negotiation.class));
    }

    @Test
    void getOrCreateNegotiationReusesExisting() {
        Negotiation existing = Negotiation.builder().id(UUID.randomUUID()).deal(deal).customer(customer).build();
        when(negotiationRepository.findByDealId(deal.getId())).thenReturn(Optional.of(existing));

        Negotiation negotiation = service.getOrCreateNegotiation(deal);

        assertThat(negotiation).isSameAs(existing);
        verify(negotiationRepository, never()).save(any());
    }

    // ------------------------------------------------------------------
    // First version + version numbering
    // ------------------------------------------------------------------

    @Test
    void firstCounterOfferCreatesVersionOne() {
        when(negotiationRepository.findByDealId(deal.getId())).thenReturn(Optional.empty());
        Deal updated = dealWithDiscount(BigDecimal.valueOf(18), DealStatus.PENDING_APPROVAL);
        when(dealService.applyDiscount(eq(deal.getId()), eq(BigDecimal.valueOf(18)), eq("rep1")))
                .thenReturn(updated);
        when(negotiationVersionRepository.findByNegotiationIdAndStatus(any(), eq(NegotiationVersionStatus.ACTIVE)))
                .thenReturn(Optional.empty());
        when(negotiationVersionRepository.findTopByNegotiationIdOrderByVersionNumberDesc(any()))
                .thenReturn(Optional.empty());

        NegotiationVersion version = service.submitCounterOffer(deal.getId(), BigDecimal.valueOf(18), "rep1");

        assertThat(version.getVersionNumber()).isEqualTo(1);
        assertThat(version.getStatus()).isEqualTo(NegotiationVersionStatus.ACTIVE);
        assertThat(version.getCreatedBy()).isEqualTo("rep1");
        assertThat(version.getCreatedAt()).isNotNull();
    }

    @Test
    void counterOfferCreatesNewVersionAndIncrementsNumber() {
        Negotiation negotiation = Negotiation.builder().id(UUID.randomUUID()).deal(deal).customer(customer).build();
        when(negotiationRepository.findByDealId(deal.getId())).thenReturn(Optional.of(negotiation));

        NegotiationVersion v1 = NegotiationVersion.builder()
                .id(UUID.randomUUID()).negotiation(negotiation).versionNumber(1)
                .status(NegotiationVersionStatus.ACTIVE)
                .discountPercent(BigDecimal.valueOf(12)).subtotal(BigDecimal.valueOf(1000))
                .totalAmount(BigDecimal.valueOf(880)).createdBy("customer:acme").build();

        when(negotiationVersionRepository.findByNegotiationIdAndStatus(negotiation.getId(), NegotiationVersionStatus.ACTIVE))
                .thenReturn(Optional.of(v1));
        when(negotiationVersionRepository.findTopByNegotiationIdOrderByVersionNumberDesc(negotiation.getId()))
                .thenReturn(Optional.of(v1));

        Deal updated = dealWithDiscount(BigDecimal.valueOf(18), DealStatus.PENDING_APPROVAL);
        when(dealService.applyDiscount(deal.getId(), BigDecimal.valueOf(18), "customer:acme")).thenReturn(updated);

        NegotiationVersion v2 = service.submitCounterOffer(deal.getId(), BigDecimal.valueOf(18), "customer:acme");

        assertThat(v2.getVersionNumber()).isEqualTo(2);
        assertThat(v1.getStatus())
                .as("version 1 must be superseded, not deleted")
                .isEqualTo(NegotiationVersionStatus.SUPERSEDED);
        // original commercial values must not have been overwritten
        assertThat(v1.getDiscountPercent()).isEqualByComparingTo(BigDecimal.valueOf(12));
        assertThat(v2.getDiscountPercent()).isEqualByComparingTo(updated.effectiveDiscountPercent());
    }

    @Test
    void versionCommercialValuesAndLineItemsAreCaptured() {
        when(negotiationRepository.findByDealId(deal.getId())).thenReturn(Optional.empty());
        Deal updated = dealWithDiscount(BigDecimal.valueOf(18), DealStatus.PENDING_APPROVAL);
        when(dealService.applyDiscount(any(), any(), any())).thenReturn(updated);
        when(negotiationVersionRepository.findByNegotiationIdAndStatus(any(), any())).thenReturn(Optional.empty());
        when(negotiationVersionRepository.findTopByNegotiationIdOrderByVersionNumberDesc(any()))
                .thenReturn(Optional.empty());

        ArgumentCaptor<NegotiationVersion> captor = ArgumentCaptor.forClass(NegotiationVersion.class);
        service.submitCounterOffer(deal.getId(), BigDecimal.valueOf(18), "customer:acme");
        verify(negotiationVersionRepository, atLeastOnce()).save(captor.capture());

        NegotiationVersion saved = captor.getAllValues().get(captor.getAllValues().size() - 1);
        assertThat(saved.getTotalAmount()).isEqualByComparingTo(updated.getTotalAmount());
        assertThat(saved.getSubtotal()).isEqualByComparingTo(updated.getSubtotal());
        assertThat(saved.getItems()).hasSize(1);
        assertThat(saved.getItems().get(0).getProductSku()).isEqualTo("SKU-1");
        assertThat(saved.getNegotiation().getDeal()).isEqualTo(deal);
    }

    @Test
    void counterOfferResultingInRejectedDealMarksVersionRejected() {
        when(negotiationRepository.findByDealId(deal.getId())).thenReturn(Optional.empty());
        Deal rejected = dealWithDiscount(BigDecimal.valueOf(80), DealStatus.REJECTED);
        when(dealService.applyDiscount(any(), any(), any())).thenReturn(rejected);
        when(negotiationVersionRepository.findByNegotiationIdAndStatus(any(), any())).thenReturn(Optional.empty());
        when(negotiationVersionRepository.findTopByNegotiationIdOrderByVersionNumberDesc(any()))
                .thenReturn(Optional.empty());

        NegotiationVersion version = service.submitCounterOffer(deal.getId(), BigDecimal.valueOf(80), "customer:acme");

        assertThat(version.getStatus()).isEqualTo(NegotiationVersionStatus.REJECTED);
    }

    @Test
    void unchangedCommercialStateStillProducesANewVersion() {
        // A counter-offer always creates a version, even one that mirrors the current terms —
        // materiality only governs whether prior approvals are invalidated (DealService's concern).
        when(negotiationRepository.findByDealId(deal.getId())).thenReturn(Optional.empty());
        Deal unchanged = dealWithDiscount(BigDecimal.valueOf(12), DealStatus.APPROVED);
        when(dealService.applyDiscount(any(), any(), any())).thenReturn(unchanged);
        when(negotiationVersionRepository.findByNegotiationIdAndStatus(any(), any())).thenReturn(Optional.empty());
        when(negotiationVersionRepository.findTopByNegotiationIdOrderByVersionNumberDesc(any()))
                .thenReturn(Optional.empty());

        NegotiationVersion version = service.submitCounterOffer(deal.getId(), BigDecimal.valueOf(12), "customer:acme");

        assertThat(version.getVersionNumber()).isEqualTo(1);
        assertThat(version.getStatus()).isEqualTo(NegotiationVersionStatus.ACTIVE);
    }

    // ------------------------------------------------------------------
    // Messages
    // ------------------------------------------------------------------

    @Test
    void addMessageAssociatesWithNegotiationAndAuthor() {
        Negotiation negotiation = Negotiation.builder().id(UUID.randomUUID()).deal(deal).customer(customer).build();
        when(negotiationRepository.findById(negotiation.getId())).thenReturn(Optional.of(negotiation));
        when(negotiationMessageRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var message = service.addMessage(negotiation.getId(), "customer:acme", "CUSTOMER", "Can we do better?", null);

        assertThat(message.getNegotiation()).isEqualTo(negotiation);
        assertThat(message.getAuthor()).isEqualTo("customer:acme");
        assertThat(message.getAuthorRole()).isEqualTo("CUSTOMER");
        assertThat(message.getContent()).isEqualTo("Can we do better?");
    }

    @Test
    void addMessageRejectsBlankContent() {
        assertThat(org.assertj.core.api.Assertions.catchThrowable(() ->
                service.addMessage(UUID.randomUUID(), "rep1", "INTERNAL", "  ", null)))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
