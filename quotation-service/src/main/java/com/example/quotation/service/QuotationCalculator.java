package com.example.quotation.service;

import com.example.quotation.model.Product;
import com.example.quotation.model.Quotation;
import com.example.quotation.model.QuotationLine;

/**
 * All money math lives here, server-side, so the client can display live totals but can
 * never dictate what a quotation is actually worth.
 */
public final class QuotationCalculator {

    private QuotationCalculator() {
    }

    public static void applyLine(QuotationLine line, Product product) {
        double subtotal = line.getQuantity() * line.getUnitPrice();
        double discountAmount = subtotal * line.getDiscountPercent() / 100.0;
        double taxableAmount = subtotal - discountAmount;
        double taxAmount = taxableAmount * line.getTaxPercent() / 100.0;
        double lineTotal = taxableAmount + taxAmount;
        double cost = line.getQuantity() * product.getCostPrice();
        double margin = taxableAmount - cost;

        line.setSubtotal(round(subtotal));
        line.setDiscountAmount(round(discountAmount));
        line.setTaxAmount(round(taxAmount));
        line.setLineTotal(round(lineTotal));
        line.setMargin(round(margin));
    }

    public static void recomputeTotals(Quotation quotation) {
        double subtotal = 0;
        double discountTotal = 0;
        double taxTotal = 0;
        double total = 0;
        double grossMargin = 0;

        for (QuotationLine line : quotation.getLines()) {
            subtotal += line.getSubtotal();
            discountTotal += line.getDiscountAmount();
            taxTotal += line.getTaxAmount();
            total += line.getLineTotal();
            grossMargin += line.getMargin();
        }

        quotation.setSubtotal(round(subtotal));
        quotation.setDiscountTotal(round(discountTotal));
        quotation.setTaxTotal(round(taxTotal));
        quotation.setTotal(round(total));
        quotation.setGrossMargin(round(grossMargin));
        quotation.setMarginPercent(total > 0 ? round(grossMargin / total * 100.0) : 0);
    }

    private static double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
