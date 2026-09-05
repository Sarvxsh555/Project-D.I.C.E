package com.dice.service;

import com.dice.domain.Inventory;
import com.dice.domain.Product;
import com.dice.domain.Warehouse;
import com.dice.repository.InventoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.Mockito.*;

/** §18 — inventory core: reservation is atomic and never exceeds availability. */
@ExtendWith(MockitoExtension.class)
class InventoryServiceTest {

    @Mock private InventoryRepository inventoryRepository;

    private InventoryService service;
    private UUID warehouseId;
    private UUID productId;

    @BeforeEach
    void setUp() {
        service = new InventoryService(inventoryRepository);
        warehouseId = UUID.randomUUID();
        productId = UUID.randomUUID();
    }

    private Inventory row(int available, int reserved, int fulfilled) {
        return Inventory.builder()
                .id(UUID.randomUUID())
                .warehouse(Warehouse.builder().id(warehouseId).code("MAIN").build())
                .product(Product.builder().id(productId).sku("SKU-1").build())
                .availableQty(available).reservedQty(reserved).fulfilledQty(fulfilled)
                .build();
    }

    @Test
    void warehouseProductStockLookupReturnsAvailability() {
        when(inventoryRepository.findByWarehouseIdAndProductId(warehouseId, productId))
                .thenReturn(Optional.of(row(50, 0, 0)));

        assertThat(service.availableQuantity(warehouseId, productId)).isEqualTo(50);
    }

    @Test
    void stockLookupReturnsZeroWhenNoRowExists() {
        when(inventoryRepository.findByWarehouseIdAndProductId(warehouseId, productId))
                .thenReturn(Optional.empty());

        assertThat(service.availableQuantity(warehouseId, productId)).isEqualTo(0);
    }

    @Test
    void reservationMovesQuantityFromAvailableToReserved() {
        Inventory inv = row(50, 0, 0);
        when(inventoryRepository.lockByWarehouseIdAndProductId(warehouseId, productId)).thenReturn(Optional.of(inv));
        when(inventoryRepository.save(any(Inventory.class))).thenAnswer(i -> i.getArgument(0));

        Inventory updated = service.reserve(warehouseId, productId, 20);

        assertThat(updated.getAvailableQty()).isEqualTo(30);
        assertThat(updated.getReservedQty()).isEqualTo(20);
    }

    @Test
    void reservationCannotExceedAvailableQuantity() {
        Inventory inv = row(10, 0, 0);
        when(inventoryRepository.lockByWarehouseIdAndProductId(warehouseId, productId)).thenReturn(Optional.of(inv));

        Throwable thrown = catchThrowable(() -> service.reserve(warehouseId, productId, 11));

        assertThat(thrown).isInstanceOf(IllegalStateException.class);
        verify(inventoryRepository, never()).save(any());
    }

    @Test
    void reservationOfUnknownInventoryRowFails() {
        when(inventoryRepository.lockByWarehouseIdAndProductId(warehouseId, productId)).thenReturn(Optional.empty());

        Throwable thrown = catchThrowable(() -> service.reserve(warehouseId, productId, 1));

        assertThat(thrown).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void releaseMovesQuantityBackToAvailable() {
        Inventory inv = row(10, 15, 0);
        when(inventoryRepository.lockByWarehouseIdAndProductId(warehouseId, productId)).thenReturn(Optional.of(inv));
        when(inventoryRepository.save(any(Inventory.class))).thenAnswer(i -> i.getArgument(0));

        Inventory updated = service.release(warehouseId, productId, 5);

        assertThat(updated.getAvailableQty()).isEqualTo(15);
        assertThat(updated.getReservedQty()).isEqualTo(10);
    }

    @Test
    void fulfillMovesReservedToFulfilled() {
        Inventory inv = row(0, 20, 5);
        when(inventoryRepository.lockByWarehouseIdAndProductId(warehouseId, productId)).thenReturn(Optional.of(inv));
        when(inventoryRepository.save(any(Inventory.class))).thenAnswer(i -> i.getArgument(0));

        Inventory updated = service.fulfill(warehouseId, productId, 12);

        assertThat(updated.getReservedQty()).isEqualTo(8);
        assertThat(updated.getFulfilledQty()).isEqualTo(17);
    }

    @Test
    void fulfillCannotExceedReservedQuantity() {
        Inventory inv = row(0, 5, 0);
        when(inventoryRepository.lockByWarehouseIdAndProductId(warehouseId, productId)).thenReturn(Optional.of(inv));

        Throwable thrown = catchThrowable(() -> service.fulfill(warehouseId, productId, 6));

        assertThat(thrown).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void reservationQuantityMustBePositive() {
        Throwable thrown = catchThrowable(() -> service.reserve(warehouseId, productId, 0));
        assertThat(thrown).isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(inventoryRepository);
    }
}
