package com.example.login.admin;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PriceListRepository extends JpaRepository<PriceListEntry, Long> {
}
