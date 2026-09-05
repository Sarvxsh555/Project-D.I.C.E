package com.dice.service;

import com.dice.domain.ApprovalSnapshot;
import com.dice.domain.Customer;
import com.dice.domain.Deal;
import com.dice.domain.DealLine;
import com.dice.domain.Negotiation;
import com.dice.domain.Product;
import com.dice.domain.enums.DealStatus;
import com.dice.events.EventPublisher;
import com.dice.repository.ApprovalSnapshotRepository;
import com.dice.repository.CustomerRepository;
import com.dice.repository.DealRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.Authentication;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * §17 — Customer portal ownership/security tests. A customer must never reach
 * another customer's deal by changing an id, and every mutating action must
 * derive its actor and ownership from the authenticated principal only.
 */
@ExtendWith(MockitoExtension.class)
class CustomerPortalServiceTest {

    @Mock private CustomerRepository customerRepository;
    @Mock private DealRepository dealRepository;
    @Mock private NegotiationService negotiationService;
    @Mock private ApprovalSnapshotRepository approvalSnapshotRepository;
    @Mock private AuditService auditService;
    @Mock private EventPublisher eventPublisher;

    private CustomerPortalService service;

    private Customer customerA;
    private Customer customerB;
    private Deal dealOfA;

    @BeforeEach
    void setUp() {
        service = new CustomerPortalService(customerRepository, dealRepository, negotiationService,
                approvalSnapshotRepository, auditService, eventPublisher);

        customerA = Customer.builder().id(UUID.randomUUID()).name("Customer A").build();
        customerB = Customer.builder().id(UUID.randomUUID()).name("Customer B").build();

        Product product = Product.builder()
                .id(UUID.randomUUID()).sku("SKU-1").name("Widget")
                .listPrice(BigDecimal.valueOf(100)).standardCost(BigDecimal.valueOf(50)).build();
        DealLine line = DealLine.builder()
                .id(UUID.randomUUID()).product(product).quantity(5)
                .unitPrice(BigDecimal.valueOf(100)).discountPercent(BigDecimal.TEN)
                .lineTotal(BigDecimal.valueOf(450)).build();
        dealOfA = Deal.builder()
                .id(UUID.randomUUID()).dealNumber("DICE-000001")
                .customer(customerA).status(DealStatus.APPROVED)
                .version(3L)
                .subtotal(BigDecimal.valueOf(500)).discountAmount(BigDecimal.valueOf(50))
                .totalAmount(BigDecimal.valueOf(450))
                .lines(new ArrayList<>(List.of(line))).build();
        line.setDeal(dealOfA);
    }

    private Authentication authAs(String username) {
        return new TestingAuthenticationToken(username, "n/a", "ROLE_CUSTOMER");
    }

    // ------------------------------------------------------------------
    // Ownership
    // ------------------------------------------------------------------

    @Test
    void customerCanAccessOwnQuotation() {
        when(customerRepository.findByPortalUsername("custA")).thenReturn(Optional.of(customerA));
        when(dealRepository.findWithLinesById(dealOfA.getId())).thenReturn(Optional.of(dealOfA));

        Deal result = service.viewOwnQuotation(authAs("custA"), dealOfA.getId());

        assertThat(result).isEqualTo(dealOfA);
    }

    @Test
    void customerCannotAccessAnotherCustomersQuotation() {
        when(customerRepository.findByPortalUsername("custB")).thenReturn(Optional.of(customerB));
        when(dealRepository.findWithLinesById(dealOfA.getId())).thenReturn(Optional.of(dealOfA));

        Throwable thrown = catchThrowable(() -> service.viewOwnQuotation(authAs("custB"), dealOfA.getId()));

        assertThat(thrown).isInstanceOf(SecurityException.class);
    }

    @Test
    void customerCannotSubmitCounterOfferOnAnotherCustomersQuotation() {
        when(customerRepository.findByPortalUsername("custB")).thenReturn(Optional.of(customerB));
        when(dealRepository.findWithLinesById(dealOfA.getId())).thenReturn(Optional.of(dealOfA));

        Throwable thrown = catchThrowable(() ->
                service.submitCounterOffer(authAs("custB"), dealOfA.getId(), BigDecimal.valueOf(20)));

        assertThat(thrown).isInstanceOf(SecurityException.class);
        verify(negotiationService, never()).submitCounterOffer(any(UUID.class), any(BigDecimal.class), any(String.class));
    }

    @Test
    void customerCannotAddCommentToAnotherCustomersNegotiation() {
        when(customerRepository.findByPortalUsername("custB")).thenReturn(Optional.of(customerB));
        when(dealRepository.findWithLinesById(dealOfA.getId())).thenReturn(Optional.of(dealOfA));

        Throwable thrown = catchThrowable(() ->
                service.addComment(authAs("custB"), dealOfA.getId(), "hello", null));

        assertThat(thrown).isInstanceOf(SecurityException.class);
        verify(negotiationService, never()).addMessage(any(), any(), any(), any(), any());
    }

    @Test
    void customerCannotConfirmAnotherCustomersQuotation() {
        when(customerRepository.findByPortalUsername("custB")).thenReturn(Optional.of(customerB));
        when(dealRepository.findWithLinesById(dealOfA.getId())).thenReturn(Optional.of(dealOfA));

        Throwable thrown = catchThrowable(() -> service.confirmQuotation(authAs("custB"), dealOfA.getId()));

        assertThat(thrown).isInstanceOf(SecurityException.class);
        verify(dealRepository, never()).save(any());
    }

    @Test
    void manipulatedDealIdDoesNotBypassOwnershipCheck() {
        UUID someoneElsesDealId = UUID.randomUUID();
        Deal othersDeal = Deal.builder().id(someoneElsesDealId).dealNumber("DICE-999")
                .customer(customerB).status(DealStatus.APPROVED)
                .lines(new ArrayList<>()).build();
        when(customerRepository.findByPortalUsername("custA")).thenReturn(Optional.of(customerA));
        when(dealRepository.findWithLinesById(someoneElsesDealId)).thenReturn(Optional.of(othersDeal));

        Throwable thrown = catchThrowable(() -> service.viewOwnQuotation(authAs("custA"), someoneElsesDealId));

        assertThat(thrown).isInstanceOf(SecurityException.class);
    }

    @Test
    void unauthenticatedAccessIsRejected() {
        Throwable thrown = catchThrowable(() -> service.viewOwnQuotation(null, dealOfA.getId()));
        assertThat(thrown).isInstanceOf(SecurityException.class);
    }

    @Test
    void noPortalAccountForPrincipalIsRejected() {
        when(customerRepository.findByPortalUsername("ghost")).thenReturn(Optional.empty());

        Throwable thrown = catchThrowable(() -> service.viewOwnQuotation(authAs("ghost"), dealOfA.getId()));

        assertThat(thrown).isInstanceOf(SecurityException.class);
    }

    // ------------------------------------------------------------------
    // Confirmation eligibility (17.6)
    // ------------------------------------------------------------------

    @Test
    void confirmSucceedsWhenApprovedAndSnapshotMatchesCurrentVersion() {
        when(customerRepository.findByPortalUsername("custA")).thenReturn(Optional.of(customerA));
        when(dealRepository.findWithLinesById(dealOfA.getId())).thenReturn(Optional.of(dealOfA));
        when(dealRepository.save(any(Deal.class))).thenAnswer(inv -> inv.getArgument(0));

        ApprovalSnapshot snapshot = ApprovalSnapshot.builder()
                .dealVersion(3L).discountPercent(dealOfA.effectiveDiscountPercent())
                .totalAmount(dealOfA.getTotalAmount()).build();
        when(approvalSnapshotRepository.findLatestByDealId(dealOfA.getId())).thenReturn(Optional.of(snapshot));

        Negotiation negotiation = Negotiation.builder().id(UUID.randomUUID()).build();
        when(negotiationService.getOrCreateNegotiation(any())).thenReturn(negotiation);

        Deal confirmed = service.confirmQuotation(authAs("custA"), dealOfA.getId());

        assertThat(confirmed.getStatus()).isEqualTo(DealStatus.CONFIRMED);
        verify(negotiationService).markActiveVersionAccepted(negotiation.getId());
    }

    @Test
    void confirmFailsWhenDealNotApproved() {
        dealOfA.setStatus(DealStatus.PENDING_APPROVAL);
        when(customerRepository.findByPortalUsername("custA")).thenReturn(Optional.of(customerA));
        when(dealRepository.findWithLinesById(dealOfA.getId())).thenReturn(Optional.of(dealOfA));

        Throwable thrown = catchThrowable(() -> service.confirmQuotation(authAs("custA"), dealOfA.getId()));

        assertThat(thrown).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void confirmFailsWhenDealVersionIsStaleRelativeToSnapshot() {
        when(customerRepository.findByPortalUsername("custA")).thenReturn(Optional.of(customerA));
        when(dealRepository.findWithLinesById(dealOfA.getId())).thenReturn(Optional.of(dealOfA));

        // snapshot was taken at an earlier deal version than the deal's current one
        ApprovalSnapshot snapshot = ApprovalSnapshot.builder()
                .dealVersion(1L).discountPercent(dealOfA.effectiveDiscountPercent())
                .totalAmount(dealOfA.getTotalAmount()).build();
        when(approvalSnapshotRepository.findLatestByDealId(dealOfA.getId())).thenReturn(Optional.of(snapshot));

        Throwable thrown = catchThrowable(() -> service.confirmQuotation(authAs("custA"), dealOfA.getId()));

        assertThat(thrown).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void confirmFailsWhenNoApprovalSnapshotExists() {
        when(customerRepository.findByPortalUsername("custA")).thenReturn(Optional.of(customerA));
        when(dealRepository.findWithLinesById(dealOfA.getId())).thenReturn(Optional.of(dealOfA));
        when(approvalSnapshotRepository.findLatestByDealId(dealOfA.getId())).thenReturn(Optional.empty());

        Throwable thrown = catchThrowable(() -> service.confirmQuotation(authAs("custA"), dealOfA.getId()));

        assertThat(thrown).isInstanceOf(IllegalStateException.class);
    }
}
