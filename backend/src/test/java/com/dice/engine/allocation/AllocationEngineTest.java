package com.dice.engine.allocation;

import com.dice.config.DiceProperties;
import com.dice.domain.Warehouse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** §19 — deterministic warehouse ranking and greedy split allocation. */
class AllocationEngineTest {

    private AllocationEngine engine;

    @BeforeEach
    void setUp() {
        DiceProperties properties = new DiceProperties(null, null, null,
                new DiceProperties.Fulfillment(1.0, 1.0, 0.25), null, null, null);
        engine = new AllocationEngine(properties);
    }

    private Warehouse warehouse(String code, int dispatchDays, double shippingCost) {
        return Warehouse.builder().code(code).dispatchDays(dispatchDays)
                .shippingCostFactor(BigDecimal.valueOf(shippingCost)).active(true).build();
    }

    @Test
    void fullStockFromOneWarehouseSatisfiesRequirement() {
        Warehouse main = warehouse("MAIN", 1, 1.0);
        var ranked = engine.rank(List.of(new AllocationEngine.Candidate(main, 20)));
        var allocations = engine.allocate(ranked, 10);

        assertThat(allocations).hasSize(1);
        assertThat(allocations.get(0).warehouse().getCode()).isEqualTo("MAIN");
        assertThat(allocations.get(0).allocatedQty()).isEqualTo(10);
    }

    @Test
    void splitsAcrossTwoWarehousesWhenFirstCannotCoverAll() {
        Warehouse main = warehouse("MAIN", 1, 1.0);
        Warehouse east = warehouse("EAST", 2, 1.5);
        var candidates = List.of(
                new AllocationEngine.Candidate(main, 6),
                new AllocationEngine.Candidate(east, 4));

        var allocations = engine.allocate(engine.rank(candidates), 10);

        int totalAllocated = allocations.stream().mapToInt(AllocationEngine.RankedAllocation::allocatedQty).sum();
        assertThat(totalAllocated).isEqualTo(10);
        assertThat(allocations).hasSize(2);
    }

    @Test
    void insufficientStockLeavesRemainderForBackorder() {
        Warehouse main = warehouse("MAIN", 1, 1.0);
        Warehouse east = warehouse("EAST", 2, 1.0);
        var candidates = List.of(
                new AllocationEngine.Candidate(main, 4),
                new AllocationEngine.Candidate(east, 3));

        var allocations = engine.allocate(engine.rank(candidates), 10);
        int totalAllocated = allocations.stream().mapToInt(AllocationEngine.RankedAllocation::allocatedQty).sum();

        assertThat(totalAllocated).isEqualTo(7);
    }

    @Test
    void neverAllocatesMoreThanAvailable() {
        Warehouse main = warehouse("MAIN", 1, 1.0);
        var allocations = engine.allocate(engine.rank(List.of(new AllocationEngine.Candidate(main, 5))), 100);

        assertThat(allocations.get(0).allocatedQty()).isEqualTo(5);
    }

    @Test
    void zeroStockCandidateProducesNoAllocation() {
        Warehouse main = warehouse("MAIN", 1, 1.0);
        var allocations = engine.allocate(engine.rank(List.of(new AllocationEngine.Candidate(main, 0))), 5);

        assertThat(allocations).isEmpty();
    }

    @Test
    void rankingPrefersCheaperFasterWarehouseOverExpensiveSlowerOne() {
        Warehouse cheap = warehouse("CHEAP", 1, 1.0);
        Warehouse pricey = warehouse("PRICEY", 5, 3.0);
        var ranked = engine.rank(List.of(
                new AllocationEngine.Candidate(pricey, 100),
                new AllocationEngine.Candidate(cheap, 100)));

        assertThat(ranked.get(0).warehouse().getCode()).isEqualTo("CHEAP");
    }

    @Test
    void inactiveWarehousesAreExcludedFromRanking() {
        Warehouse inactive = Warehouse.builder().code("OLD").dispatchDays(1)
                .shippingCostFactor(BigDecimal.ONE).active(false).build();
        var ranked = engine.rank(List.of(new AllocationEngine.Candidate(inactive, 50)));

        assertThat(ranked).isEmpty();
    }
}
