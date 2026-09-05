package com.dice.service;

import com.dice.domain.Deal;
import com.dice.domain.DealLine;
import com.dice.engine.margin.MarginEngine;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * The single place deal totals are computed. Anything that changes a line —
 * an Odoo webhook, a portal counter-offer, a rep edit — must call
 * {@link #recalculate(Deal)} afterwards, or the rollups drift from the lines.
 */
@Service
@RequiredArgsConstructor
public class PricingService {

    private final MarginEngine marginEngine;

    /**
     * Recomputes line totals, then the deal rollups and blended margin.
     * Mutates {@code deal} in place and returns it for chaining.
     */
    public Deal recalculate(Deal deal) {
        BigDecimal gross = BigDecimal.ZERO;
        BigDecimal net = BigDecimal.ZERO;

        for (DealLine line : deal.getLines()) {
            BigDecimal lineGross = line.grossTotal();
            BigDecimal lineNet = line.netUnitPrice()
                    .multiply(BigDecimal.valueOf(line.getQuantity()))
                    .setScale(2, RoundingMode.HALF_UP);

            line.setLineTotal(lineNet);
            line.setMarginPercent(lineMarginPercent(line, lineNet));

            gross = gross.add(lineGross);
            net = net.add(lineNet);
        }

        deal.setSubtotal(gross.setScale(2, RoundingMode.HALF_UP));
        deal.setDiscountAmount(gross.subtract(net).setScale(2, RoundingMode.HALF_UP));
        deal.setTotalAmount(net.setScale(2, RoundingMode.HALF_UP));
        deal.setMarginPercent(marginEngine.compute(deal).marginPercent());

        return deal;
    }

    private BigDecimal lineMarginPercent(DealLine line, BigDecimal lineNet) {
        if (lineNet.signum() == 0) {
            return BigDecimal.ZERO.setScale(4);
        }
        BigDecimal cost = line.getProduct().getStandardCost()
                .multiply(BigDecimal.valueOf(line.getQuantity()));
        return lineNet.subtract(cost)
                .divide(lineNet, 6, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100))
                .setScale(4, RoundingMode.HALF_UP);
    }

    /**
     * The discount percentage that would land a line exactly on {@code targetMarginPercent}.
     * Used by the negotiation screen to answer "how low can I go?".
     */
    public BigDecimal maxDiscountForMargin(DealLine line, BigDecimal targetMarginPercent) {
        BigDecimal cost = line.getProduct().getStandardCost();
        BigDecimal list = line.getUnitPrice();
        if (list.signum() == 0) {
            return BigDecimal.ZERO;
        }
        // net = cost / (1 - target/100); discount = (list - net) / list
        BigDecimal marginFactor = BigDecimal.ONE.subtract(
                targetMarginPercent.divide(BigDecimal.valueOf(100), 6, RoundingMode.HALF_UP));
        if (marginFactor.signum() <= 0) {
            return BigDecimal.ZERO;
        }
        BigDecimal floorPrice = cost.divide(marginFactor, 6, RoundingMode.HALF_UP);
        return list.subtract(floorPrice)
                .divide(list, 6, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100))
                .max(BigDecimal.ZERO)
                .setScale(4, RoundingMode.HALF_UP);
    }
}
