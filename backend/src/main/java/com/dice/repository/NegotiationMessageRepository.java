package com.dice.repository;

import com.dice.domain.NegotiationMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface NegotiationMessageRepository extends JpaRepository<NegotiationMessage, UUID> {

    List<NegotiationMessage> findByNegotiationIdOrderByCreatedAtAsc(UUID negotiationId);
}
