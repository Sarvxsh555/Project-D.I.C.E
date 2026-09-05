package com.dice.repository;

import com.dice.domain.Approval;
import com.dice.domain.enums.ApprovalLevel;
import com.dice.domain.enums.ApprovalStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ApprovalRepository extends JpaRepository<Approval, UUID> {

    /** deal is lazy by default; ApprovalView reads it outside the transaction. */
    @EntityGraph(attributePaths = "deal")
    List<Approval> findByDealIdOrderByRequestedAtDesc(UUID dealId);

    @EntityGraph(attributePaths = "deal")
    List<Approval> findByStatus(ApprovalStatus status);

    /** The approver's inbox. */
    @EntityGraph(attributePaths = "deal")
    List<Approval> findByRequiredRoleAndStatus(String requiredRole, ApprovalStatus status);

    boolean existsByDealIdAndStatus(UUID dealId, ApprovalStatus status);

    long countByStatus(ApprovalStatus status);

    /** The sequential quotation approval chain's history for a deal, newest first. */
    List<Approval> findByDealIdAndApprovalLevelIsNotNullOrderByRequestedAtDesc(UUID dealId);

    boolean existsByDealIdAndApprovalLevelAndStatus(UUID dealId, ApprovalLevel level, ApprovalStatus status);
}
