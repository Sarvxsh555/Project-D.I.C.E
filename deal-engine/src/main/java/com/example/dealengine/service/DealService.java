package com.example.dealengine.service;

import com.example.dealengine.client.QuoteSnapshotDto;
import com.example.dealengine.client.QuotationServiceClient;
import com.example.dealengine.model.*;
import com.example.dealengine.repository.DealRepository;
import com.example.dealengine.repository.OrderRepository;
import com.example.dealengine.repository.QuoteVersionRepository;
import com.example.dealengine.security.UserPrincipal;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class DealService {

    private final DealRepository deals;
    private final QuoteVersionRepository quoteVersions;
    private final OrderRepository orders;
    private final QuotationServiceClient quotationServiceClient;
    private final AtomicInteger orderSequence = new AtomicInteger(1000);

    public DealService(DealRepository deals, QuoteVersionRepository quoteVersions, OrderRepository orders,
                        QuotationServiceClient quotationServiceClient) {
        this.deals = deals;
        this.quoteVersions = quoteVersions;
        this.orders = orders;
        this.quotationServiceClient = quotationServiceClient;
    }

    public Deal createDeal(Long quotationId, String bearerToken, String username) {
        deals.findByQuotationId(quotationId).ifPresent(d -> {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A deal already exists for this quotation");
        });

        QuoteSnapshotDto snapshot = quotationServiceClient.fetchQuote(quotationId, bearerToken);

        Deal deal = new Deal();
        deal.setQuotationId(snapshot.id);
        deal.setQuoteNo(snapshot.quoteNo);
        deal.setCustomerId(snapshot.customerId);
        deal.setCustomerName(snapshot.customerName);
        deal.setOwnerUsername(username);
        deal.setStatus(DealStatus.OPEN);
        deal = deals.save(deal);

        takeSnapshot(deal, snapshot, "Deal opened");
        return deal;
    }

    public QuoteVersion snapshot(Long dealId, String bearerToken, String reason) {
        Deal deal = getOrThrow(dealId);
        QuoteSnapshotDto snapshot = quotationServiceClient.fetchQuote(deal.getQuotationId(), bearerToken);
        deal.setUpdatedAt(Instant.now());
        deals.save(deal);
        return takeSnapshot(deal, snapshot, reason);
    }

    public Deal markLost(Long dealId, String reason) {
        Deal deal = getOrThrow(dealId);
        if (deal.getStatus() != DealStatus.OPEN) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only an open deal can be marked lost");
        }
        deal.setStatus(DealStatus.LOST);
        deal.setCloseReason(reason);
        deal.setUpdatedAt(Instant.now());
        return deals.save(deal);
    }

    /**
     * Validates and converts a quote into an order. This is the one place Quote -> Order
     * conversion happens, and it re-checks the live quote state in quotation-service rather
     * than trusting a stale local copy.
     */
    public Order convertToOrder(Long dealId, String bearerToken, String username) {
        Deal deal = getOrThrow(dealId);

        if (deal.getStatus() != DealStatus.OPEN) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Deal is not open");
        }
        if (orders.findByQuotationId(deal.getQuotationId()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This quote has already been converted to an order");
        }

        QuoteSnapshotDto snapshot = quotationServiceClient.fetchQuote(deal.getQuotationId(), bearerToken);
        if (!"APPROVED".equals(snapshot.stage) && !"ORDERED".equals(snapshot.stage)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Quote must be APPROVED before it can become an order (currently " + snapshot.stage + ")");
        }
        if (snapshot.lines == null || snapshot.lines.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cannot convert a quote with no line items");
        }

        QuoteVersion finalVersion = takeSnapshot(deal, snapshot, "Converted to order");

        Order order = new Order();
        order.setOrderNo(nextOrderNo());
        order.setDealId(deal.getId());
        order.setQuotationId(deal.getQuotationId());
        order.setSourceQuoteVersion(finalVersion.getVersionNumber());
        order.setCustomerId(snapshot.customerId);
        order.setCustomerName(snapshot.customerName);
        order.setSubtotal(snapshot.subtotal);
        order.setDiscountTotal(snapshot.discountTotal);
        order.setTaxTotal(snapshot.taxTotal);
        order.setTotal(snapshot.total);

        for (QuoteSnapshotDto.Line line : snapshot.lines) {
            OrderLine orderLine = new OrderLine();
            orderLine.setOrder(order);
            orderLine.setProductId(line.productId);
            orderLine.setProductName(line.productName);
            orderLine.setQuantity(line.quantity);
            orderLine.setUnitPrice(line.unitPrice);
            orderLine.setLineTotal(line.lineTotal);
            order.getLines().add(orderLine);
        }
        order = orders.save(order);

        deal.setStatus(DealStatus.WON);
        deal.setUpdatedAt(Instant.now());
        deals.save(deal);

        return order;
    }

    public List<QuoteVersion> getVersions(Long dealId, UserPrincipal actor) {
        assertOwnsDeal(getOrThrow(dealId), actor);
        return quoteVersions.findByDealIdOrderByVersionNumberAsc(dealId);
    }

    public List<Order> getOrdersForDeal(Long dealId, UserPrincipal actor) {
        assertOwnsDeal(getOrThrow(dealId), actor);
        return orders.findByDealId(dealId);
    }

    public Order getOrderOrThrow(Long id) {
        return orders.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
    }

    public Order getOrderVisibleTo(Long id, UserPrincipal actor) {
        Order order = getOrderOrThrow(id);
        assertOwnsOrder(order, actor);
        return order;
    }

    public List<Order> listMine(UserPrincipal actor) {
        if (actor.isCustomer()) {
            if (actor.customerId() == null) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This account is not linked to a customer");
            }
            return orders.findByCustomerIdOrderByCreatedAtDesc(actor.customerId());
        }
        // Staff roles (admin, sales rep, sales manager, finance) see every order —
        // they need to look one up for fulfillment/billing without knowing its id upfront.
        return orders.findAllByOrderByCreatedAtDesc();
    }

    public Deal getOrThrow(Long id) {
        return deals.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Deal not found"));
    }

    public Deal getDealVisibleTo(Long id, UserPrincipal actor) {
        Deal deal = getOrThrow(id);
        assertOwnsDeal(deal, actor);
        return deal;
    }

    public List<Deal> list() {
        return deals.findAll();
    }

    public void assertOwnsOrder(Order order, UserPrincipal actor) {
        if (actor.isCustomer() && (actor.customerId() == null || !actor.customerId().equals(order.getCustomerId()))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This order belongs to another account");
        }
    }

    public void assertOwnsDeal(Deal deal, UserPrincipal actor) {
        if (actor.isCustomer() && (actor.customerId() == null || !actor.customerId().equals(deal.getCustomerId()))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This deal belongs to another account");
        }
    }

    private QuoteVersion takeSnapshot(Deal deal, QuoteSnapshotDto snapshot, String reason) {
        QuoteVersion version = new QuoteVersion();
        version.setDealId(deal.getId());
        version.setVersionNumber(quoteVersions.countByDealId(deal.getId()) + 1);
        version.setReason(reason);
        version.setStageAtSnapshot(snapshot.stage);
        version.setSubtotal(snapshot.subtotal);
        version.setDiscountTotal(snapshot.discountTotal);
        version.setTaxTotal(snapshot.taxTotal);
        version.setTotal(snapshot.total);
        version.setMarginPercent(snapshot.marginPercent);

        if (snapshot.lines != null) {
            for (QuoteSnapshotDto.Line line : snapshot.lines) {
                QuoteVersionLine versionLine = new QuoteVersionLine();
                versionLine.setQuoteVersion(version);
                versionLine.setProductId(line.productId);
                versionLine.setProductName(line.productName);
                versionLine.setQuantity(line.quantity);
                versionLine.setUnitPrice(line.unitPrice);
                versionLine.setDiscountPercent(line.discountPercent);
                versionLine.setTaxPercent(line.taxPercent);
                versionLine.setLineTotal(line.lineTotal);
                version.getLines().add(versionLine);
            }
        }
        return quoteVersions.save(version);
    }

    private String nextOrderNo() {
        String year = String.valueOf(LocalDate.now(ZoneOffset.UTC).getYear());
        String candidate;
        do {
            candidate = "ORD-" + year + "-" + orderSequence.incrementAndGet();
        } while (orders.existsByOrderNo(candidate));
        return candidate;
    }
}
