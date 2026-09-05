package com.dice.service;

import com.dice.domain.Customer;
import com.dice.domain.PriceList;
import com.dice.domain.PriceListItem;
import com.dice.domain.Product;
import com.dice.repository.PriceListItemRepository;
import com.dice.repository.PriceListRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

/**
 * The single authority for what a customer pays for a product. A price a
 * caller supplies (a portal quote, a rep's typed-in number) is never final —
 * everything downstream must call {@link #resolve} and use the result.
 *
 * <p>Selection prefers the most specific matching {@link PriceList}: an exact
 * tier match beats a segment match, which beats the unrestricted default
 * list. Ties break on {@link PriceList#getPriority()} (lower wins).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PriceResolutionService {

    private final PriceListRepository priceListRepository;
    private final PriceListItemRepository priceListItemRepository;

    /**
     * Resolves the authoritative unit price for {@code product} as sold to
     * {@code customer}.
     *
     * @throws IllegalArgumentException if the product is inactive, or no
     *      active price list — nor the product's own list price — yields a
     *      price for it
     */
    public ResolvedPrice resolve(Customer customer, Product product) {
        if (!product.isActive()) {
            throw new IllegalArgumentException(
                    "Product %s is inactive and cannot be priced".formatted(product.getSku()));
        }

        List<PriceList> candidates = priceListRepository.findByActiveTrueOrderByPriorityAsc().stream()
                .filter(list -> appliesTo(list, customer))
                .sorted(Comparator.comparingInt((PriceList list) -> specificity(list, customer))
                        .thenComparing(PriceList::getPriority))
                .toList();

        for (PriceList list : candidates) {
            var item = priceListItemRepository.findByPriceListIdAndProductId(list.getId(), product.getId());
            if (item.isPresent()) {
                return fromItem(list, item.get());
            }
        }

        if (product.getListPrice() != null) {
            return new ResolvedPrice(product.getListPrice(), "USD", null, PriceSource.PRODUCT_LIST_PRICE);
        }

        throw new IllegalArgumentException(
                "No valid price could be resolved for product %s".formatted(product.getSku()));
    }

    /** Whether a list is even a candidate for this customer (unrestricted, or scope matches). */
    private boolean appliesTo(PriceList list, Customer customer) {
        if (list.isDefault()) {
            return true;
        }
        boolean tierMatches = list.getCustomerTier() != null
                && list.getCustomerTier().equalsIgnoreCase(customer.getTier());
        boolean segmentMatches = list.getCustomerSegment() != null
                && list.getCustomerSegment() == customer.getSegment();
        return tierMatches || segmentMatches;
    }

    /** Lower is more specific: exact tier beats segment beats the default list. */
    private int specificity(PriceList list, Customer customer) {
        if (list.getCustomerTier() != null && list.getCustomerTier().equalsIgnoreCase(customer.getTier())) {
            return 0;
        }
        if (list.getCustomerSegment() != null && list.getCustomerSegment() == customer.getSegment()) {
            return 1;
        }
        return 2;
    }

    private ResolvedPrice fromItem(PriceList list, PriceListItem item) {
        return new ResolvedPrice(item.getUnitPrice(), list.getCurrency(), list.getCode(), PriceSource.PRICE_LIST);
    }

    public enum PriceSource {
        /** Matched a row in a {@link PriceList}. */
        PRICE_LIST,
        /** No price list carried this product; fell back to {@link Product#getListPrice()}. */
        PRODUCT_LIST_PRICE
    }

    /**
     * The outcome of a resolution: the price to charge, its currency, and
     * where it came from (useful for audit/debugging, not for trust decisions
     * — callers must treat this as final regardless of source).
     */
    public record ResolvedPrice(
            java.math.BigDecimal unitPrice,
            String currency,
            String priceListCode,
            PriceSource source) {
    }
}
