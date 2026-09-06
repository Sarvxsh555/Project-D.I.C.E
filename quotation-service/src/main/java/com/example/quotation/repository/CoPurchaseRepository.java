package com.example.quotation.repository;

import com.example.quotation.model.QuotationLine;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.List;

/**
 * Observed co-purchase statistics drawn from real quote history, so recommendation strength
 * reflects what customers actually put on the same quote instead of a hand-seeded constant.
 */
public interface CoPurchaseRepository extends Repository<QuotationLine, Long> {

    /**
     * For every product that has ever appeared on the same quote as {@code productId}, how many
     * distinct quotes the pair shared. Returns rows of [productId (Number), pairCount (Number)].
     */
    @Query(value = """
            SELECT ql2.product_id, COUNT(DISTINCT ql1.quotation_id)
            FROM quotation_line ql1
            JOIN quotation_line ql2
              ON ql2.quotation_id = ql1.quotation_id
             AND ql2.product_id <> ql1.product_id
            WHERE ql1.product_id = :productId
            GROUP BY ql2.product_id
            """, nativeQuery = true)
    List<Object[]> findCoPurchaseCounts(@Param("productId") Long productId);

    /** How many distinct quotes contain {@code productId} at all - the denominator for confidence. */
    @Query(value = "SELECT COUNT(DISTINCT quotation_id) FROM quotation_line WHERE product_id = :productId",
            nativeQuery = true)
    long countQuotesContaining(@Param("productId") Long productId);
}
