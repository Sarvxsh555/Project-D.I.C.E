package com.example.dealengine.repository;

import com.example.dealengine.model.QuoteVersion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface QuoteVersionRepository extends JpaRepository<QuoteVersion, Long> {
    List<QuoteVersion> findByDealIdOrderByVersionNumberAsc(Long dealId);
    int countByDealId(Long dealId);
}
