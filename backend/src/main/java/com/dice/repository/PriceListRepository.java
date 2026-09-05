package com.dice.repository;

import com.dice.domain.PriceList;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PriceListRepository extends JpaRepository<PriceList, UUID> {

    List<PriceList> findByActiveTrueOrderByPriorityAsc();
}
