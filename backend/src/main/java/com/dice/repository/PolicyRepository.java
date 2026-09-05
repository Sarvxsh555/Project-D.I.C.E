package com.dice.repository;

import com.dice.domain.Policy;
import com.dice.domain.enums.PolicyType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PolicyRepository extends JpaRepository<Policy, UUID> {

    Optional<Policy> findByCode(String code);

    /** The working set for an evaluation; scoping is applied in PolicyEngine. */
    List<Policy> findByActiveTrueOrderByPriorityAsc();

    List<Policy> findByTypeAndActiveTrue(PolicyType type);
}
