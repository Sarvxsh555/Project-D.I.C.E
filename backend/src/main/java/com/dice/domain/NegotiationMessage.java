package com.dice.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/** A comment thread entry on a {@link Negotiation}. */
@Entity
@Table(name = "negotiation_messages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NegotiationMessage {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "negotiation_id", nullable = false)
    private Negotiation negotiation;

    /** The version on the table when this message was written, if relevant. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "negotiation_version_id")
    private NegotiationVersion version;

    /** The specific line the comment is about, if any. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deal_line_id")
    private DealLine dealLine;

    /** Authenticated principal (username, or portal customer identity) who wrote it. */
    @Column(nullable = false, length = 128)
    private String author;

    /** {@code CUSTOMER} or {@code INTERNAL} — who the author was acting as. */
    @Column(name = "author_role", nullable = false, length = 16)
    private String authorRole;

    @Column(nullable = false, columnDefinition = "text")
    private String content;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
