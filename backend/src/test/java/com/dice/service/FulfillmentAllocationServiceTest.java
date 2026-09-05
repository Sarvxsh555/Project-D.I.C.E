package com.dice.service;

import com.dice.config.DiceProperties;
import com.dice.domain.Customer;
import com.dice.domain.Deal;
import com.dice.domain.DealLine;
import com.dice.domain.FulfillmentPlan;
import com.dice.domain.Product;
import com.dice.domain.Warehouse;
import com.dice.domain.enums.DealStatus;
import com.dice.domain.enums.FulfillmentStatus;
import com.dice.engine.allocation.AllocationEngine;
import com.dice.events.EventPublisher;
import com.dice.repository.DealRepository;
import com.dice.repository.FulfillmentPlanRepository;
import com.dice.repository.WarehouseRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** §19 — fulfillment allocation: auto-ranking, manual override, backorders. */
@ExtendWith(MockitoExtension.class)
class FulfillmentAllocationServiceTest {

    @Mock private DealRepository dealRepository;
    @Mock private WarehouseRepository warehouseRepository;
    @Mock private InventoryService inventoryService;
    @Mock private FulfillmentPlanRepository fulfillmentPlanRepository;
    @Mock private AuditService auditService;
    @Mock private EventPublisher eventPublisher;

    private FulfillmentAllocationService service;
    private AllocationEngine allocationEngine;
    private Deal deal;
    private DealLine line;
    private Product product;
    private Warehouse main;
    private Warehouse east;

    @BeforeEach
    void setUp() {
        allocationEngine = new AllocationEngine(new DiceProperties(null, null, null,
                new DiceProperties.Fulfillment(1.0, 1.0, 0.25), null, null, null));
        service = new FulfillmentAllocationService(dealRepository, warehouseRepository, inventoryService,
                allocationEngine, fulfillmentPlanRepository, auditService, eventPublisher);

        main = Warehouse.builder().id(UUID.randomUUID()).code("MAIN").dispatchDays(1)
                .shippingCostFactor(BigDecimal.ONE).active(true).build();
        east = Warehouse.builder().id(UUID.randomUUID()).code("EAST").dispatchDays(2)
                .shippingCostFactor(BigDecimal.valueOf(1.5)).active(true).build();

        product = Product.builder().id(UUID.randomUUID()).sku("SKU-1").name("Widget")
                .listPrice(BigDecimal.TEN).standardCost(BigDecimal.ONE).build();
        line = DealLine.builder().id(UUID.randomUUID()).product(product).quantity(10)
                .unitPrice(BigDecimal.TEN).discountPercent(BigDecimal.ZERO).build();
        deal = Deal.builder().id(UUID.randomUUID()).dealNumber("DICE-000001")
                .customer(Customer.builder().id(UUID.randomUUID()).name("Acme").build())
                .status(DealStatus.CONFIRMED)
                .lines(new ArrayList<>(List.of(line))).build();
        line.setDeal(deal);

        lenient().when(dealRepository.findWithLinesById(deal.getId())).thenReturn(Optional.of(deal));
        lenient().when(dealRepository.save(any(Deal.class))).thenAnswer(i -> i.getArgument(0));
        lenient().when(fulfillmentPlanRepository.save(any(FulfillmentPlan.class))).thenAnswer(i -> {
            FulfillmentPlan p = i.getArgument(0);
            if (p.getId() == null) p.setId(UUID.randomUUID());
            return p;
        });
    }

    @Test
    void fullStockFromOneWarehouseAllocatesEntireLine() {
        when(warehouseRepository.findByActiveTrueOrderByDispatchDaysAsc()).thenReturn(List.of(main));
        when(inventoryService.availableQuantity(main.getId(), product.getId())).thenReturn(20);

        FulfillmentPlan plan = service.allocate(deal.getId(), "ops1");

        assertThat(plan.getLines()).hasSize(1);
        assertThat(plan.getLines().get(0).getQuantity()).isEqualTo(10);
        assertThat(plan.getLines().get(0).getStatus()).isEqualTo(FulfillmentStatus.ALLOCATED);
        verify(inventoryService).reserve(main.getId(), product.getId(), 10);
    }

    @Test
    void splitsAcrossTwoWarehousesWhenNeeded() {
        when(warehouseRepository.findByActiveTrueOrderByDispatchDaysAsc()).thenReturn(List.of(main, east));
        when(inventoryService.availableQuantity(main.getId(), product.getId())).thenReturn(6);
        when(inventoryService.availableQuantity(east.getId(), product.getId())).thenReturn(4);

        FulfillmentPlan plan = service.allocate(deal.getId(), "ops1");

        int total = plan.getLines().stream().mapToInt(l -> l.getQuantity()).sum();
        assertThat(total).isEqualTo(10);
        assertThat(plan.getLines()).noneMatch(l -> l.getStatus() == FulfillmentStatus.BACKORDERED);
        verify(inventoryService).reserve(main.getId(), product.getId(), 6);
        verify(inventoryService).reserve(east.getId(), product.getId(), 4);
    }

    @Test
    void insufficientStockAcrossAllWarehousesCreatesBackorder() {
        when(warehouseRepository.findByActiveTrueOrderByDispatchDaysAsc()).thenReturn(List.of(main, east));
        when(inventoryService.availableQuantity(main.getId(), product.getId())).thenReturn(4);
        when(inventoryService.availableQuantity(east.getId(), product.getId())).thenReturn(3);

        FulfillmentPlan plan = service.allocate(deal.getId(), "ops1");

        var backorder = plan.getLines().stream()
                .filter(l -> l.getStatus() == FulfillmentStatus.BACKORDERED)
                .findFirst().orElseThrow();
        assertThat(backorder.getQuantity()).isEqualTo(3);
        assertThat(backorder.getWarehouse()).isNull();
    }

    @Test
    void zeroStockEverywhereBackordersTheWholeLine() {
        when(warehouseRepository.findByActiveTrueOrderByDispatchDaysAsc()).thenReturn(List.of(main));
        when(inventoryService.availableQuantity(main.getId(), product.getId())).thenReturn(0);

        FulfillmentPlan plan = service.allocate(deal.getId(), "ops1");

        assertThat(plan.getLines()).hasSize(1);
        assertThat(plan.getLines().get(0).getStatus()).isEqualTo(FulfillmentStatus.BACKORDERED);
        assertThat(plan.getLines().get(0).getQuantity()).isEqualTo(10);
        verify(inventoryService, never()).reserve(any(), any(), anyInt());
    }

    @Test
    void allocationRejectedWhenDealIsNotConfirmed() {
        deal.setStatus(DealStatus.PENDING_APPROVAL);

        Throwable thrown = catchThrowable(() -> service.allocate(deal.getId(), "ops1"));

        assertThat(thrown).isInstanceOf(IllegalStateException.class);
        verifyNoInteractions(inventoryService);
    }

    // ------------------------------------------------------------------
    // Manual override
    // ------------------------------------------------------------------

    @Test
    void validOverrideAllocatesExactlyAsRequested() {
        when(warehouseRepository.findByCode("MAIN")).thenReturn(Optional.of(main));
        when(inventoryService.availableQuantity(main.getId(), product.getId())).thenReturn(10);

        var override = new FulfillmentAllocationService.Override(line.getId(), "MAIN", 10);
        FulfillmentPlan plan = service.allocateWithOverrides(deal.getId(), List.of(override), "ops1");

        assertThat(plan.getLines()).hasSize(1);
        assertThat(plan.getLines().get(0).getStatus()).isEqualTo(FulfillmentStatus.ALLOCATED);
        verify(inventoryService).reserve(main.getId(), product.getId(), 10);
    }

    @Test
    void overrideExceedingAvailableStockIsRejected() {
        when(warehouseRepository.findByCode("MAIN")).thenReturn(Optional.of(main));
        when(inventoryService.availableQuantity(main.getId(), product.getId())).thenReturn(5);

        // Within the line's required quantity (10) but above what MAIN actually has (5).
        var override = new FulfillmentAllocationService.Override(line.getId(), "MAIN", 8);

        Throwable thrown = catchThrowable(() ->
                service.allocateWithOverrides(deal.getId(), List.of(override), "ops1"));

        assertThat(thrown).isInstanceOf(IllegalArgumentException.class);
        verify(inventoryService, never()).reserve(any(), any(), anyInt());
    }

    @Test
    void overrideForUnknownWarehouseIsRejected() {
        when(warehouseRepository.findByCode("NOPE")).thenReturn(Optional.empty());

        var override = new FulfillmentAllocationService.Override(line.getId(), "NOPE", 5);

        Throwable thrown = catchThrowable(() ->
                service.allocateWithOverrides(deal.getId(), List.of(override), "ops1"));

        assertThat(thrown).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void overrideExceedingLineQuantityIsRejected() {
        when(warehouseRepository.findByCode("MAIN")).thenReturn(Optional.of(main));

        var override = new FulfillmentAllocationService.Override(line.getId(), "MAIN", 999);

        Throwable thrown = catchThrowable(() ->
                service.allocateWithOverrides(deal.getId(), List.of(override), "ops1"));

        assertThat(thrown).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void overrideLeavesRemainderAsBackorder() {
        when(warehouseRepository.findByCode("MAIN")).thenReturn(Optional.of(main));
        when(inventoryService.availableQuantity(main.getId(), product.getId())).thenReturn(6);

        var override = new FulfillmentAllocationService.Override(line.getId(), "MAIN", 6);
        FulfillmentPlan plan = service.allocateWithOverrides(deal.getId(), List.of(override), "ops1");

        var backorder = plan.getLines().stream()
                .filter(l -> l.getStatus() == FulfillmentStatus.BACKORDERED)
                .findFirst().orElseThrow();
        assertThat(backorder.getQuantity()).isEqualTo(4);
    }
}
