package com.dice.service;

import com.dice.domain.Approval;
import com.dice.domain.ApprovalSnapshot;
import com.dice.domain.Customer;
import com.dice.domain.Deal;
import com.dice.domain.enums.ApprovalLevel;
import com.dice.domain.enums.ApprovalStatus;
import com.dice.domain.enums.DealStatus;
import com.dice.domain.enums.QuotationDecision;
import com.dice.engine.decision.DecisionResolver;
import com.dice.events.EventPublisher;
import com.dice.repository.ApprovalRepository;
import com.dice.repository.ApprovalSnapshotRepository;
import com.dice.repository.DealRepository;
import com.dice.repository.EvaluationRepository;
import com.dice.security.Role;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ApprovalServiceTest {

    @Mock private ApprovalRepository approvalRepository;
    @Mock private ApprovalSnapshotRepository approvalSnapshotRepository;
    @Mock private EvaluationRepository evaluationRepository;
    @Mock private DealRepository dealRepository;
    @Mock private EventPublisher eventPublisher;
    @Mock private AuditService auditService;

    private ApprovalService service;
    private Deal deal;

    @BeforeEach
    void setUp() {
        service = new ApprovalService(approvalRepository, approvalSnapshotRepository, evaluationRepository,
                dealRepository, eventPublisher, auditService, new ObjectMapper());

        deal = Deal.builder()
                .id(UUID.randomUUID())
                .dealNumber("DICE-000001")
                .customer(Customer.builder().name("Acme").build())
                .status(DealStatus.PENDING_APPROVAL)
                .ownerUsername("rep1")
                .build();

        // save() assigns an id like a real repository's generated-value insert would,
        // and otherwise just returns what it was handed.
        lenient().when(approvalRepository.save(any(Approval.class))).thenAnswer(inv -> {
            Approval a = inv.getArgument(0);
            if (a.getId() == null) {
                a.setId(UUID.randomUUID());
            }
            return a;
        });
        lenient().when(dealRepository.save(any(Deal.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private Approval levelApproval(ApprovalLevel level, ApprovalStatus status) {
        return Approval.builder()
                .id(UUID.randomUUID())
                .deal(deal)
                .approvalLevel(level)
                .requiredRole(level.name())
                .status(status)
                .build();
    }

    // ------------------------------------------------------------------
    // 1. Sales manager approval
    // ------------------------------------------------------------------
    @Test
    void salesManagerApprovalOpensFinanceOperationsNext() {
        Approval approval = levelApproval(ApprovalLevel.SALES_MANAGER, ApprovalStatus.PENDING);
        when(approvalRepository.findById(approval.getId())).thenReturn(Optional.of(approval));
        when(approvalRepository.existsByDealIdAndApprovalLevelAndStatus(
                deal.getId(), ApprovalLevel.FINANCE_OPERATIONS, ApprovalStatus.PENDING)).thenReturn(false);

        Approval result = service.approve(approval.getId(), Role.SALES_MANAGER, "mgr1", "Looks fine");

        assertThat(result.getStatus()).isEqualTo(ApprovalStatus.APPROVED);

        ArgumentCaptor<Approval> saved = ArgumentCaptor.forClass(Approval.class);
        verify(approvalRepository, times(2)).save(saved.capture());
        Approval opened = saved.getAllValues().get(1);
        assertThat(opened.getApprovalLevel()).isEqualTo(ApprovalLevel.FINANCE_OPERATIONS);
        assertThat(opened.getStatus()).isEqualTo(ApprovalStatus.PENDING);

        // Deal is not yet fully approved — only the first of two levels cleared.
        verify(dealRepository, never()).save(argThat(d -> d.getStatus() == DealStatus.APPROVED));
    }

    // ------------------------------------------------------------------
    // 2. Finance operations approval — final level clears the deal and snapshots it
    // ------------------------------------------------------------------
    @Test
    void financeOperationsApprovalClearsDealAndTakesSnapshot() {
        Approval approval = levelApproval(ApprovalLevel.FINANCE_OPERATIONS, ApprovalStatus.PENDING);
        when(approvalRepository.findById(approval.getId())).thenReturn(Optional.of(approval));
        when(approvalRepository.existsByDealIdAndApprovalLevelAndStatus(
                deal.getId(), ApprovalLevel.SALES_MANAGER, ApprovalStatus.APPROVED)).thenReturn(true);

        Approval result = service.approve(approval.getId(), Role.FINANCE, "fin1", "Cleared");

        assertThat(result.getStatus()).isEqualTo(ApprovalStatus.APPROVED);
        assertThat(deal.getStatus()).isEqualTo(DealStatus.APPROVED);
        verify(approvalSnapshotRepository).save(any(ApprovalSnapshot.class));
    }

    // ------------------------------------------------------------------
    // 3. Sequential approval — Finance cannot go first
    // ------------------------------------------------------------------
    @Test
    void financeCannotBeDecidedBeforeSalesManagerClears() {
        Approval approval = levelApproval(ApprovalLevel.FINANCE_OPERATIONS, ApprovalStatus.PENDING);
        when(approvalRepository.findById(approval.getId())).thenReturn(Optional.of(approval));
        when(approvalRepository.existsByDealIdAndApprovalLevelAndStatus(
                deal.getId(), ApprovalLevel.SALES_MANAGER, ApprovalStatus.APPROVED)).thenReturn(false);

        assertThatThrownBy(() -> service.approve(approval.getId(), Role.FINANCE, "fin1", "Cleared"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("SALES_MANAGER");
    }

    @Test
    void ensureSequentialApprovalOpensSalesManagerFirstOnAFreshDeal() {
        var decision = new DecisionResolver.QuotationDecisionResult(
                QuotationDecision.APPROVAL_REQUIRED, 10, true, List.of("SALES_MANAGER"),
                "WAIT_FOR_SALES_MANAGER", List.of("SERVICE_DISCOUNT_EXCEEDED"));
        when(approvalRepository.findByDealIdAndApprovalLevelIsNotNullOrderByRequestedAtDesc(deal.getId()))
                .thenReturn(List.of());

        Optional<Approval> opened = service.ensureSequentialApproval(deal, null, decision);

        assertThat(opened).isPresent();
        assertThat(opened.get().getApprovalLevel()).isEqualTo(ApprovalLevel.SALES_MANAGER);
    }

    @Test
    void ensureSequentialApprovalMovesToFinanceOnceSalesManagerApproved() {
        var decision = new DecisionResolver.QuotationDecisionResult(
                QuotationDecision.APPROVAL_REQUIRED, 10, true, List.of("SALES_MANAGER"),
                "WAIT_FOR_SALES_MANAGER", List.of());
        Approval approvedSalesManager = levelApproval(ApprovalLevel.SALES_MANAGER, ApprovalStatus.APPROVED);
        when(approvalRepository.findByDealIdAndApprovalLevelIsNotNullOrderByRequestedAtDesc(deal.getId()))
                .thenReturn(List.of(approvedSalesManager));

        Optional<Approval> opened = service.ensureSequentialApproval(deal, null, decision);

        assertThat(opened).isPresent();
        assertThat(opened.get().getApprovalLevel()).isEqualTo(ApprovalLevel.FINANCE_OPERATIONS);
    }

    // ------------------------------------------------------------------
    // 4. Rejection
    // ------------------------------------------------------------------
    @Test
    void rejectionStopsTheDeal() {
        Approval approval = levelApproval(ApprovalLevel.SALES_MANAGER, ApprovalStatus.PENDING);
        when(approvalRepository.findById(approval.getId())).thenReturn(Optional.of(approval));

        Approval result = service.reject(approval.getId(), Role.SALES_MANAGER, "mgr1", "Margin too thin");

        assertThat(result.getStatus()).isEqualTo(ApprovalStatus.REJECTED);
        assertThat(deal.getStatus()).isEqualTo(DealStatus.REJECTED);
    }

    // ------------------------------------------------------------------
    // 5. Return for revision
    // ------------------------------------------------------------------
    @Test
    void returnForRevisionMarksDealAsNeedingRevision() {
        Approval approval = levelApproval(ApprovalLevel.SALES_MANAGER, ApprovalStatus.PENDING);
        when(approvalRepository.findById(approval.getId())).thenReturn(Optional.of(approval));

        Approval result = service.returnForRevision(approval.getId(), Role.SALES_MANAGER, "mgr1", "Fix the quantities");

        assertThat(result.getStatus()).isEqualTo(ApprovalStatus.RETURNED);
        assertThat(deal.getStatus()).isEqualTo(DealStatus.RETURNED_FOR_REVISION);
    }

    @Test
    void blankReasonIsRejectedForEveryAction() {
        Approval approval = levelApproval(ApprovalLevel.SALES_MANAGER, ApprovalStatus.PENDING);

        assertThatThrownBy(() -> service.approve(approval.getId(), Role.SALES_MANAGER, "mgr1", "  "))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.reject(approval.getId(), Role.SALES_MANAGER, "mgr1", null))
                .isInstanceOf(IllegalArgumentException.class);

        verifyNoInteractions(approvalRepository);
    }

    // ------------------------------------------------------------------
    // 6. Unauthorized approval
    // ------------------------------------------------------------------
    @Test
    void wrongRoleCannotDecideALevel() {
        Approval approval = levelApproval(ApprovalLevel.FINANCE_OPERATIONS, ApprovalStatus.PENDING);
        when(approvalRepository.findById(approval.getId())).thenReturn(Optional.of(approval));

        assertThatThrownBy(() -> service.approve(approval.getId(), Role.SALES_MANAGER, "mgr1", "Trying anyway"))
                .isInstanceOf(SecurityException.class);
    }

    @Test
    void wrongRoleCannotDecideALegacyRoleRoutedApproval() {
        Approval approval = Approval.builder()
                .id(UUID.randomUUID())
                .deal(deal)
                .requiredRole("FINANCE")
                .status(ApprovalStatus.PENDING)
                .build();
        when(approvalRepository.findById(approval.getId())).thenReturn(Optional.of(approval));

        assertThatThrownBy(() -> service.approve(approval.getId(), Role.SALES_MANAGER, "mgr1", "Trying anyway"))
                .isInstanceOf(SecurityException.class);
    }

    // ------------------------------------------------------------------
    // 7. Self-approval on own quotation
    // ------------------------------------------------------------------
    @Test
    void ownerCannotDecideTheirOwnDealsApproval() {
        Approval approval = levelApproval(ApprovalLevel.SALES_MANAGER, ApprovalStatus.PENDING);
        when(approvalRepository.findById(approval.getId())).thenReturn(Optional.of(approval));

        assertThatThrownBy(() -> service.approve(approval.getId(), Role.SALES_MANAGER, "rep1", "Self sign-off"))
                .isInstanceOf(SecurityException.class);
    }

    // ------------------------------------------------------------------
    // 8. Invalid approval transition
    // ------------------------------------------------------------------
    @Test
    void terminalApprovalCannotBeDecidedAgain() {
        Approval approval = levelApproval(ApprovalLevel.SALES_MANAGER, ApprovalStatus.APPROVED);
        when(approvalRepository.findById(approval.getId())).thenReturn(Optional.of(approval));

        assertThatThrownBy(() -> service.approve(approval.getId(), Role.SALES_MANAGER, "mgr1", "Again"))
                .isInstanceOf(IllegalStateException.class);
    }

    // ------------------------------------------------------------------
    // 9. Duplicate approval request prevention
    // ------------------------------------------------------------------
    @Test
    void pendingLevelApprovalIsReusedRatherThanDuplicated() {
        var decision = new DecisionResolver.QuotationDecisionResult(
                QuotationDecision.APPROVAL_REQUIRED, 10, true, List.of("SALES_MANAGER"),
                "WAIT_FOR_SALES_MANAGER", List.of());
        Approval pending = levelApproval(ApprovalLevel.SALES_MANAGER, ApprovalStatus.PENDING);
        when(approvalRepository.findByDealIdAndApprovalLevelIsNotNullOrderByRequestedAtDesc(deal.getId()))
                .thenReturn(List.of(pending));

        Optional<Approval> result = service.ensureSequentialApproval(deal, null, decision);

        assertThat(result).contains(pending);
        verify(approvalRepository, never()).save(any());
    }

    @Test
    void noApprovalIsRequestedWhenDecisionDoesNotRequireOne() {
        var decision = new DecisionResolver.QuotationDecisionResult(
                QuotationDecision.ORDER_READY, 0, false, List.of(), "NONE", List.of());

        Optional<Approval> result = service.ensureSequentialApproval(deal, null, decision);

        assertThat(result).isEmpty();
        verifyNoInteractions(approvalRepository);
    }
}
