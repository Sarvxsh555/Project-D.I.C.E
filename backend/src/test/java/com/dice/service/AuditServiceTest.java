package com.dice.service;

import com.dice.domain.AuditEvent;
import com.dice.repository.AuditEventRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * §12 — Audit trail correctness.
 *
 * Verifies that:
 * - AuditService records the correct entity type, entity ID, action, and actor
 * - old/new values are stored correctly
 * - reason is stored where applicable
 * - actor always comes from the backend, never defaults to null
 */
@ExtendWith(MockitoExtension.class)
class AuditServiceTest {

    @Mock private AuditEventRepository auditEventRepository;

    private AuditService auditService;

    @BeforeEach
    void setUp() {
        auditService = new AuditService(auditEventRepository);
        when(auditEventRepository.save(any(AuditEvent.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    // ------------------------------------------------------------------
    // 1. Discount change creates audit event with old/new values
    // ------------------------------------------------------------------
    @Test
    void discountChangeAuditEventHasCorrectOldAndNewValues() {
        UUID dealId = UUID.randomUUID();

        auditService.record(
                AuditService.DEAL, dealId,
                AuditService.DISCOUNT_CHANGED, "rep1",
                "5%", "15%", null);

        ArgumentCaptor<AuditEvent> captor = ArgumentCaptor.forClass(AuditEvent.class);
        verify(auditEventRepository).save(captor.capture());
        AuditEvent event = captor.getValue();

        assertThat(event.getAggregateType()).isEqualTo("DEAL");
        assertThat(event.getAggregateId()).isEqualTo(dealId);
        assertThat(event.getEventType()).isEqualTo(AuditService.DISCOUNT_CHANGED);
        assertThat(event.getOldValue()).isEqualTo("5%");
        assertThat(event.getNewValue()).isEqualTo("15%");
        assertThat(event.getActor()).isEqualTo("rep1");
    }

    // ------------------------------------------------------------------
    // 2. Quotation edit creates audit event
    // ------------------------------------------------------------------
    @Test
    void quotationEditAuditEventIsRecordedWithLineCountChange() {
        UUID dealId = UUID.randomUUID();

        auditService.record(
                AuditService.DEAL, dealId,
                AuditService.QUOTATION_EDITED, "rep1",
                "lines=2", "lines=3", null);

        ArgumentCaptor<AuditEvent> captor = ArgumentCaptor.forClass(AuditEvent.class);
        verify(auditEventRepository).save(captor.capture());
        AuditEvent event = captor.getValue();

        assertThat(event.getEventType()).isEqualTo(AuditService.QUOTATION_EDITED);
        assertThat(event.getOldValue()).isEqualTo("lines=2");
        assertThat(event.getNewValue()).isEqualTo("lines=3");
    }

    // ------------------------------------------------------------------
    // 3. Approval creates audit event with reason
    // ------------------------------------------------------------------
    @Test
    void approvalAuditEventCarriesReasonAndCorrectAction() {
        UUID approvalId = UUID.randomUUID();

        auditService.record(
                AuditService.APPROVAL, approvalId,
                AuditService.APPROVED, "mgr1",
                "PENDING", "APPROVED", "Margin looks healthy");

        ArgumentCaptor<AuditEvent> captor = ArgumentCaptor.forClass(AuditEvent.class);
        verify(auditEventRepository).save(captor.capture());
        AuditEvent event = captor.getValue();

        assertThat(event.getAggregateType()).isEqualTo("APPROVAL");
        assertThat(event.getEventType()).isEqualTo(AuditService.APPROVED);
        assertThat(event.getOldValue()).isEqualTo("PENDING");
        assertThat(event.getNewValue()).isEqualTo("APPROVED");
        assertThat(event.getReason()).isEqualTo("Margin looks healthy");
        assertThat(event.getActor()).isEqualTo("mgr1");
    }

    // ------------------------------------------------------------------
    // 4. Rejection creates audit event
    // ------------------------------------------------------------------
    @Test
    void rejectionAuditEventHasCorrectActionAndReason() {
        UUID approvalId = UUID.randomUUID();

        auditService.record(
                AuditService.APPROVAL, approvalId,
                AuditService.REJECTED, "mgr1",
                "PENDING", "REJECTED", "Margin too thin");

        ArgumentCaptor<AuditEvent> captor = ArgumentCaptor.forClass(AuditEvent.class);
        verify(auditEventRepository).save(captor.capture());
        AuditEvent event = captor.getValue();

        assertThat(event.getEventType()).isEqualTo(AuditService.REJECTED);
        assertThat(event.getReason()).isEqualTo("Margin too thin");
    }

    // ------------------------------------------------------------------
    // 5. Return creates audit event
    // ------------------------------------------------------------------
    @Test
    void returnAuditEventIsRecordedCorrectly() {
        UUID approvalId = UUID.randomUUID();

        auditService.record(
                AuditService.APPROVAL, approvalId,
                AuditService.RETURNED, "mgr1",
                "PENDING", "RETURNED", "Fix quantities");

        ArgumentCaptor<AuditEvent> captor = ArgumentCaptor.forClass(AuditEvent.class);
        verify(auditEventRepository).save(captor.capture());
        AuditEvent event = captor.getValue();

        assertThat(event.getEventType()).isEqualTo(AuditService.RETURNED);
        assertThat(event.getReason()).isEqualTo("Fix quantities");
    }

    // ------------------------------------------------------------------
    // 6. Null actor defaults to "system"
    // ------------------------------------------------------------------
    @Test
    void nullActorDefaultsToSystem() {
        auditService.record(
                AuditService.DEAL, UUID.randomUUID(),
                AuditService.DISCOUNT_CHANGED, null,
                "0%", "10%", null);

        ArgumentCaptor<AuditEvent> captor = ArgumentCaptor.forClass(AuditEvent.class);
        verify(auditEventRepository).save(captor.capture());
        assertThat(captor.getValue().getActor()).isEqualTo("system");
    }

    // ------------------------------------------------------------------
    // 7. Convenience overload (no old/new) records null values
    // ------------------------------------------------------------------
    @Test
    void convenienceOverloadSetsNullForOldAndNewValue() {
        auditService.record(
                AuditService.DEAL, UUID.randomUUID(),
                "DEAL_CREATED", "rep1",
                "Deal created");

        ArgumentCaptor<AuditEvent> captor = ArgumentCaptor.forClass(AuditEvent.class);
        verify(auditEventRepository).save(captor.capture());
        AuditEvent event = captor.getValue();

        assertThat(event.getOldValue()).isNull();
        assertThat(event.getNewValue()).isNull();
        assertThat(event.getReason()).isEqualTo("Deal created");
    }
}
