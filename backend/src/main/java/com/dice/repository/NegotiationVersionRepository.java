package com.dice.repository;

import com.dice.domain.NegotiationVersion;
import com.dice.domain.enums.NegotiationVersionStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface NegotiationVersionRepository extends JpaRepository<NegotiationVersion, UUID> {

    @EntityGraph(attributePaths = {"items", "negotiation"})
    List<NegotiationVersion> findByNegotiationIdOrderByVersionNumberDesc(UUID negotiationId);

    Optional<NegotiationVersion> findTopByNegotiationIdOrderByVersionNumberDesc(UUID negotiationId);

    @EntityGraph(attributePaths = {"items", "negotiation"})
    Optional<NegotiationVersion> findByNegotiationIdAndStatus(UUID negotiationId, NegotiationVersionStatus status);
}
