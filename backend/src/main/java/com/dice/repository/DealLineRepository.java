package com.dice.repository;

import com.dice.domain.DealLine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface DealLineRepository extends JpaRepository<DealLine, UUID> {

    List<DealLine> findByDealIdOrderByLineNumberAsc(UUID dealId);

    void deleteByDealId(UUID dealId);
}
