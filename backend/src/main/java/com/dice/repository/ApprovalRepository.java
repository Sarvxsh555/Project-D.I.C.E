package com.dice.repository;

import com.dice.domain.Approval;
import com.dice.domain.enums.ApprovalStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ApprovalRepository extends JpaRepository<Approval, UUID> {

    List<Approval> findByDealIdOrderByRequestedAtDesc(UUID dealId);

    List<Approval> findByStatus(ApprovalStatus status);

    /** The approver's inbox. */
    List<Approval> findByRequiredRoleAndStatus(String requiredRole, ApprovalStatus status);

    boolean existsByDealIdAndStatus(UUID dealId, ApprovalStatus status);

    long countByStatus(ApprovalStatus status);
}
