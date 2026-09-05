package com.example.login.admin;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/warehouses")
public class WarehouseController extends AdminCrudController<Warehouse> {

    private final WarehouseRepository repository;

    public WarehouseController(WarehouseRepository repository) {
        this.repository = repository;
    }

    @Override
    protected JpaRepository<Warehouse, Long> repository() {
        return repository;
    }
}
