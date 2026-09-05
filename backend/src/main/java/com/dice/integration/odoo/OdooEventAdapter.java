package com.dice.integration.odoo;

import com.dice.domain.Deal;
import com.dice.events.DealEvent;
import com.dice.events.EventPublisher;
import com.dice.repository.DealRepository;
import com.dice.service.DealService;
import com.dice.service.FulfillmentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Optional;

/**
 * The seam between the outside world and the domain.
 *
 * <p>Everything inbound — a real Odoo webhook or an OEEG-generated one — arrives
 * here as an envelope of {@code {type, payload}} and leaves as a call on a
 * service. Both sources share this path deliberately: if it works against the
 * emulator, it works against Odoo.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class OdooEventAdapter {

    private static final String ACTOR = "odoo";

    private final DealRepository dealRepository;
    private final DealService dealService;
    private final FulfillmentService fulfillmentService;
    private final OdooMapper mapper;
    private final EventPublisher eventPublisher;

    /**
     * Routes one inbound event.
     *
     * @return what was done, for the webhook response — the emulator asserts on this
     */
    @Transactional
    public Result handle(String type, Map<String, Object> payload) {
        log.info("Inbound Odoo event: {}", type);

        return switch (type) {
            case DealEvent.Type.QUOTE_CREATED -> handleQuoteCreated(payload);
            case DealEvent.Type.DISCOUNT_CHANGED -> handleDiscountChanged(payload);
            case DealEvent.Type.QUANTITY_CHANGED -> handleQuantityChanged(payload);
            case DealEvent.Type.INVENTORY_CHANGED -> handleInventoryChanged(payload);
            case DealEvent.Type.COUNTER_OFFER -> handleCounterOffer(payload);
            default -> {
                log.warn("Unhandled Odoo event type: {}", type);
                yield Result.ignored("No handler for event type " + type);
            }
        };
    }

    /**
     * A new quotation in Odoo. DICE does not create the deal from the webhook —
     * the payload lacks the catalogue detail needed to price it — so this links
     * an existing deal or asks for a sync.
     */
    private Result handleQuoteCreated(Map<String, Object> payload) {
        Optional<Long> quotationId = mapper.longValue(payload, "quotationId");
        if (quotationId.isEmpty()) {
            return Result.rejected("quotationId is required");
        }

        Optional<Deal> existing = dealRepository.findByOdooQuotationId(quotationId.get());
        if (existing.isPresent()) {
            Deal deal = dealService.evaluate(existing.get().getId(),
                    DealEvent.Type.QUOTE_CREATED, ACTOR);
            return Result.processed(deal.getId(), "Re-evaluated linked deal " + deal.getDealNumber());
        }

        // Deliberately not auto-creating: an unlinked quotation is a sync gap,
        // and silently inventing a deal would hide it.
        log.info("Quotation {} has no linked DICE deal", quotationId.get());
        return Result.ignored("No DICE deal linked to Odoo quotation " + quotationId.get());
    }

    private Result handleDiscountChanged(Map<String, Object> payload) {
        return withDeal(payload, deal -> {
            BigDecimal discount = mapper.decimalValue(payload, "discountPercent")
                    .orElse(BigDecimal.ZERO);
            Deal updated = dealService.applyDiscount(deal.getId(), discount, ACTOR);
            return Result.processed(updated.getId(),
                    "Applied %s%% discount; deal is now %s".formatted(discount, updated.getStatus()));
        });
    }

    /**
     * Quantity changes arrive per line from Odoo, but DICE re-prices the whole
     * deal, so this just re-evaluates rather than patching one row.
     */
    private Result handleQuantityChanged(Map<String, Object> payload) {
        return withDeal(payload, deal -> {
            Deal updated = dealService.evaluate(deal.getId(),
                    DealEvent.Type.QUANTITY_CHANGED, ACTOR);
            return Result.processed(updated.getId(),
                    "Re-evaluated after quantity change; deal is now " + updated.getStatus());
        });
    }

    /**
     * Stock movement. Only a <em>reduction</em> can invalidate a plan, so an
     * increase is recorded without disturbing deals in flight.
     */
    private Result handleInventoryChanged(Map<String, Object> payload) {
        Optional<Long> productId = mapper.longValue(payload, "odooProductId");
        Optional<Integer> quantity = mapper.intValue(payload, "quantityOnHand");

        if (productId.isEmpty() || quantity.isEmpty()) {
            return Result.rejected("odooProductId and quantityOnHand are required");
        }

        boolean stockDropped = fulfillmentService.applyInventoryChange(
                productId.get(), quantity.get(), ACTOR);

        return Result.processed(null, stockDropped
                ? "Stock reduced for product %d; affected deals need re-planning".formatted(productId.get())
                : "Stock updated for product %d".formatted(productId.get()));
    }

    private Result handleCounterOffer(Map<String, Object> payload) {
        return withDeal(payload, deal -> {
            BigDecimal requested = mapper.decimalValue(payload, "requestedDiscountPercent")
                    .orElse(BigDecimal.ZERO);
            eventPublisher.publish(DealEvent.Type.COUNTER_OFFER, deal.getId(), ACTOR,
                    Map.of("requestedDiscountPercent", requested));
            Deal updated = dealService.applyDiscount(deal.getId(), requested, ACTOR);
            return Result.processed(updated.getId(),
                    "Counter-offer of %s%% evaluated; outcome %s".formatted(requested, updated.getStatus()));
        });
    }

    /**
     * Resolves the deal a payload refers to, by DICE id or Odoo quotation id.
     * OEEG scenarios use one or the other depending on where the deal originated.
     */
    private Result withDeal(Map<String, Object> payload, java.util.function.Function<Deal, Result> action) {
        Optional<Deal> deal = mapper.stringValue(payload, "dealId")
                .flatMap(this::parseUuid)
                .flatMap(dealRepository::findById);

        if (deal.isEmpty()) {
            deal = mapper.longValue(payload, "quotationId")
                    .flatMap(dealRepository::findByOdooQuotationId);
        }

        return deal.map(action)
                .orElseGet(() -> Result.rejected(
                        "Payload identifies no known deal (needs dealId or quotationId)"));
    }

    private Optional<java.util.UUID> parseUuid(String raw) {
        try {
            return Optional.of(java.util.UUID.fromString(raw));
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    /**
     * @param status PROCESSED, IGNORED (understood but nothing to do), or
     *               REJECTED (malformed)
     */
    public record Result(String status, java.util.UUID dealId, String message) {

        static Result processed(java.util.UUID dealId, String message) {
            return new Result("PROCESSED", dealId, message);
        }

        static Result ignored(String message) {
            return new Result("IGNORED", null, message);
        }

        static Result rejected(String message) {
            return new Result("REJECTED", null, message);
        }

        public boolean isRejected() {
            return "REJECTED".equals(status);
        }
    }
}
