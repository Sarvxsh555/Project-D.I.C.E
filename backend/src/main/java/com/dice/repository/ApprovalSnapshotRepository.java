package com.dice.repository;

import com.dice.domain.ApprovalSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ApprovalSnapshotRepository extends JpaRepository<ApprovalSnapshot, UUID> {

    /** At most one row per deal — enforced by a partial unique index in the schema. */
    Optional<ApprovalSnapshot> findByDealIdAndSupersededFalse(UUID dealId);

    List<ApprovalSnapshot> findByDealIdOrderByCapturedAtDesc(UUID dealId);
}
