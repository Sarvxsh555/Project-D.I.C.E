package com.dice.domain;

import com.dice.domain.enums.RecurringInterval;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Determines when a {@link Subscription} should next be billed. Kept as its
 * own row (rather than fields on {@code Subscription}) so a future change to
 * how a subscription is scheduled does not touch the subscription record
 * itself.
 */
@Entity
@Table(name = "subscription_billing_schedules")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubscriptionBillingSchedule {

    @Id
    @GeneratedValue
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "subscription_id", nullable = false, unique = true)
    private Subscription subscription;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private RecurringInterval frequency;

    @Column(name = "next_billing_date", nullable = false)
    private LocalDate nextBillingDate;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    /** Advances by one cadence period; the deterministic core of recurring billing. */
    public void advance() {
        nextBillingDate = frequency.advance(nextBillingDate);
    }
}
