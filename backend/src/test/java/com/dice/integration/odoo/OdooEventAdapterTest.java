package com.dice.integration.odoo;

import com.dice.domain.Approval;
import com.dice.domain.Customer;
import com.dice.domain.Deal;
import com.dice.domain.enums.ApprovalStatus;
import com.dice.events.DealEvent;
import com.dice.events.EventPublisher;
import com.dice.repository.ApprovalRepository;
import com.dice.repository.DealRepository;
import com.dice.repository.ProcessedIntegrationEventRepository;
import com.dice.security.Role;
import com.dice.service.ApprovalService;
import com.dice.service.AuditService;
import com.dice.service.DealService;
import com.dice.service.FulfillmentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OdooEventAdapterTest {

    @Mock private DealRepository dealRepository;
    @Mock private ApprovalRepository approvalRepository;
    @Mock private DealService dealService;
    @Mock private FulfillmentService fulfillmentService;
    @Mock private ApprovalService approvalService;
    @Mock private EventPublisher eventPublisher;
    @Mock private AuditService auditService;
    @Mock private ProcessedIntegrationEventRepository processedIntegrationEventRepository;

    private OdooEventAdapter adapter;
    private final OdooMapper mapper = new OdooMapper();

    @BeforeEach
    void setUp() {
        adapter = new OdooEventAdapter(dealRepository, approvalRepository, dealService, fulfillmentService,
                approvalService, mapper, eventPublisher, auditService, processedIntegrationEventRepository);
    }

    @Test
    void blankTypeIsRejected() {
        OdooEventAdapter.Result result = adapter.handle("", Map.of());

        assertThat(result.isRejected()).isTrue();
        verifyNoInteractions(auditService);
    }

    @Test
    void unsupportedEventTypeIsIgnoredButStillAudited() {
        OdooEventAdapter.Result result = adapter.handle("SOMETHING_UNKNOWN", Map.of());

        assertThat(result.status()).isEqualTo("IGNORED");
        verify(auditService).record(eq("INTEGRATION_EVENT"), any(), eq("SOMETHING_UNKNOWN"),
                eq("odoo"), isNull(), eq("IGNORED"), any());
    }

    @Test
    void duplicateEventIdIsIgnoredWithoutReprocessing() {
        when(processedIntegrationEventRepository.existsByExternalEventId("evt-1")).thenReturn(true);

        OdooEventAdapter.Result result = adapter.handle(DealEvent.Type.QUOTE_CREATED,
                Map.of("eventId", "evt-1", "quotationId", 42));

        assertThat(result.status()).isEqualTo("IGNORED");
        verifyNoInteractions(dealService);
        verify(processedIntegrationEventRepository, never()).save(any());
    }

    @Test
    void newEventIsRecordedAfterProcessing() {
        when(processedIntegrationEventRepository.existsByExternalEventId("evt-2")).thenReturn(false);
        when(dealRepository.findByOdooQuotationId(42L)).thenReturn(Optional.empty());

        adapter.handle(DealEvent.Type.QUOTE_CREATED, Map.of("eventId", "evt-2", "quotationId", 42));

        verify(processedIntegrationEventRepository).save(argThat(e -> e.getExternalEventId().equals("evt-2")));
    }

    @Test
    void customerCounterofferAliasMapsToCounterOfferHandling() {
        Deal deal = Deal.builder().id(UUID.randomUUID()).customer(Customer.builder().build()).build();
        when(dealRepository.findById(deal.getId())).thenReturn(Optional.of(deal));
        Deal evaluated = Deal.builder().id(deal.getId()).build();
        when(dealService.applyDiscount(eq(deal.getId()), any(), eq("odoo"))).thenReturn(evaluated);

        OdooEventAdapter.Result result = adapter.handle("CUSTOMER_COUNTEROFFER",
                Map.of("dealId", deal.getId().toString(), "requestedDiscountPercent", 10));

        assertThat(result.status()).isEqualTo("PROCESSED");
        verify(dealService).applyDiscount(eq(deal.getId()), any(), eq("odoo"));
    }

    @Test
    void approvalGrantedRoutesToApprovalService() {
        UUID approvalId = UUID.randomUUID();
        Deal deal = Deal.builder().id(UUID.randomUUID()).build();
        Approval approval = Approval.builder().id(approvalId).deal(deal).status(ApprovalStatus.PENDING).build();
        when(approvalRepository.findById(approvalId)).thenReturn(Optional.of(approval));
        when(approvalService.approve(eq(approvalId), eq(Role.ADMIN), eq("odoo"), any())).thenReturn(approval);

        OdooEventAdapter.Result result = adapter.handle(DealEvent.Type.APPROVAL_GRANTED,
                Map.of("approvalId", approvalId.toString()));

        assertThat(result.status()).isEqualTo("PROCESSED");
        verify(approvalService).approve(eq(approvalId), eq(Role.ADMIN), eq("odoo"), any());
    }

    @Test
    void approvalGrantedWithoutApprovalIdIsRejected() {
        OdooEventAdapter.Result result = adapter.handle(DealEvent.Type.APPROVAL_GRANTED, Map.of());

        assertThat(result.isRejected()).isTrue();
    }
}
