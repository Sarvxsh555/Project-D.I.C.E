package com.dice.repository;

import com.dice.domain.ApprovalSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ApprovalSnapshotRepository extends JpaRepository<ApprovalSnapshot, UUID> {

    List<ApprovalSnapshot> findByDealIdOrderByCapturedAtDesc(UUID dealId);

    /** The most recently captured snapshot for a deal — used by material-change detection. */
    @Query("SELECT s FROM ApprovalSnapshot s WHERE s.deal.id = :dealId ORDER BY s.capturedAt DESC LIMIT 1")
    Optional<ApprovalSnapshot> findLatestByDealId(UUID dealId);

    Optional<ApprovalSnapshot> findByApprovalId(UUID approvalId);
}
