package com.dice.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * The negotiation thread attached to a single deal. Holds no commercial state
 * of its own — {@link Deal}/{@link DealLine} stay the live pricing source and
 * each counter-offer is captured as a {@link NegotiationVersion} underneath.
 */
@Entity
@Table(name = "negotiations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Negotiation {

    @Id
    @GeneratedValue
    private UUID id;

    /** One negotiation thread per deal. */
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "deal_id", nullable = false, unique = true)
    private Deal deal;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @OneToMany(mappedBy = "negotiation", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<NegotiationVersion> versions = new ArrayList<>();

    @OneToMany(mappedBy = "negotiation", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<NegotiationMessage> messages = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public void addVersion(NegotiationVersion version) {
        versions.add(version);
        version.setNegotiation(this);
    }

    public void addMessage(NegotiationMessage message) {
        messages.add(message);
        message.setNegotiation(this);
    }
}
