package com.dice.engine.allocation;

import com.dice.config.DiceProperties;
import com.dice.domain.Warehouse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;

/**
 * Deterministic warehouse ranking + greedy split-allocation for confirmed
 * sales orders. No ML, no search — a warehouse's score is a weighted sum of
 * how much stock it has, how costly it is to ship from, and how quickly it
 * dispatches; allocation then fills the highest-ranked warehouse first, which
 * naturally minimises the number of shipments touched.
 *
 * <p>Pure/no I/O, same shape as {@code MarginEngine}/{@code RiskEngine} —
 * callers supply the current stock snapshot rather than this engine reading
 * it itself, so it stays trivially testable and free of transaction concerns.
 */
@Component
@RequiredArgsConstructor
public class AllocationEngine {

    private final DiceProperties properties;

    /** One warehouse's known availability for the product being allocated. */
    public record Candidate(Warehouse warehouse, int availableQty) {
    }

    /** {@code candidate} ranked highest-first; {@code allocatedQty} is what this line takes from it. */
    public record RankedAllocation(Warehouse warehouse, int allocatedQty) {
    }

    /**
     * Ranks candidates highest-score-first. Score rewards availability and
     * penalises shipping cost and dispatch delay, each independently weighted
     * via {@code dice.fulfillment.*}.
     */
    public List<Candidate> rank(List<Candidate> candidates) {
        DiceProperties.Fulfillment weights = properties.fulfillment() != null
                ? properties.fulfillment() : new DiceProperties.Fulfillment(1.0, 1.0, 0.25);

        return candidates.stream()
                .filter(c -> c.warehouse().isActive())
                .sorted(Comparator.comparingDouble((Candidate c) -> score(c, weights)).reversed())
                .toList();
    }

    private double score(Candidate candidate, DiceProperties.Fulfillment weights) {
        Warehouse w = candidate.warehouse();
        double shippingCost = w.getShippingCostFactor() == null
                ? 1.0 : w.getShippingCostFactor().doubleValue();
        double dispatchDays = w.getDispatchDays() == null ? 1.0 : w.getDispatchDays();

        return weights.availabilityWeight() * candidate.availableQty()
                - weights.shippingCostWeight() * shippingCost
                - weights.dispatchDaysWeight() * dispatchDays;
    }

    /**
     * Greedily fills required quantity from the ranked candidates, taking as
     * much as possible from each before moving to the next — this is what
     * keeps a shipment count low rather than spreading thin across every
     * warehouse that has any stock at all. Never allocates more than a
     * candidate's {@code availableQty}. Returns only warehouses that actually
     * received an allocation; any unmet quantity is the caller's backorder.
     */
    public List<RankedAllocation> allocate(List<Candidate> rankedCandidates, int requiredQty) {
        List<RankedAllocation> result = new java.util.ArrayList<>();
        int remaining = requiredQty;

        for (Candidate candidate : rankedCandidates) {
            if (remaining <= 0) {
                break;
            }
            int take = Math.min(remaining, Math.max(0, candidate.availableQty()));
            if (take > 0) {
                result.add(new RankedAllocation(candidate.warehouse(), take));
                remaining -= take;
            }
        }
        return result;
    }
}
