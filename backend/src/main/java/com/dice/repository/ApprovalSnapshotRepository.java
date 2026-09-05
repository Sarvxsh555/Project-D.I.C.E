package com.dice.repository;

import com.dice.domain.ApprovalSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ApprovalSnapshotRepository extends JpaRepository<ApprovalSnapshot, UUID> {

    List<ApprovalSnapshot> findByDealIdOrderByCapturedAtDesc(UUID dealId);
}
