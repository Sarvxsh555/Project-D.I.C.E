package com.dice.repository;

import com.dice.domain.CoPurchasePair;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CoPurchasePairRepository extends JpaRepository<CoPurchasePair, UUID> {

    /** All active pairs where one of the supplied SKUs is the trigger. */
    List<CoPurchasePair> findByProductSkuInAndActiveTrue(List<String> productSkus);
}
