package com.example.quotation.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;

/**
 * Read-only view of the discount ceilings maintained in the admin console (login-service
 * owns writes). D.I.C.E. reads them so an admin policy change takes effect on the next
 * evaluation instead of requiring a code change to the tier ladder.
 */
@Entity
@Immutable
@Table(name = "discount_rule")
public class DiscountRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "customer_tier")
    private String customerTier;

    @Column(name = "category")
    private String category;

    @Column(name = "min_discount")
    private Double minDiscount;

    @Column(name = "max_discount")
    private Double maxDiscount;

    @Column(name = "risk_level")
    private String riskLevel;

    @Column(name = "approval_level")
    private String approvalLevel;

    public Long getId() { return id; }
    public String getCustomerTier() { return customerTier; }
    public String getCategory() { return category; }
    public Double getMinDiscount() { return minDiscount; }
    public Double getMaxDiscount() { return maxDiscount; }
    public String getRiskLevel() { return riskLevel; }
    public String getApprovalLevel() { return approvalLevel; }
}
