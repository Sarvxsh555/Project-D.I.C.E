package com.dice.repository;

import com.dice.domain.PriceListItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PriceListItemRepository extends JpaRepository<PriceListItem, UUID> {

    Optional<PriceListItem> findByPriceListIdAndProductId(UUID priceListId, UUID productId);
}
