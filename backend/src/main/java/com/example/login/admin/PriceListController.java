package com.example.login.admin;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/price-lists")
public class PriceListController extends AdminCrudController<PriceListEntry> {

    private final PriceListRepository repository;

    public PriceListController(PriceListRepository repository) {
        this.repository = repository;
    }

    @Override
    protected JpaRepository<PriceListEntry, Long> repository() {
        return repository;
    }
}
