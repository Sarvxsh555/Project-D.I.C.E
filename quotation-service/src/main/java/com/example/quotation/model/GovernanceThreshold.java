package com.example.quotation.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * One tunable D.I.C.E. policy number, stored so ops can retune the engine without a
 * redeploy. Anything missing here falls back to the compiled-in default in
 * {@link com.example.quotation.service.ThresholdConfig}, so an empty table behaves
 * exactly like the previous hardcoded engine.
 */
@Entity
@Table(name = "governance_threshold")
public class GovernanceThreshold {

    @Id
    @Column(name = "threshold_key", length = 64)
    private String key;

    @Column(name = "threshold_value", nullable = false)
    private double value;

    @Column(name = "description")
    private String description;

    public String getKey() { return key; }
    public void setKey(String key) { this.key = key; }

    public double getValue() { return value; }
    public void setValue(double value) { this.value = value; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}
