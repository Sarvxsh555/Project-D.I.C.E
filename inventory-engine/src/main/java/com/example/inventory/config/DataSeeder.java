package com.example.inventory.config;

import com.example.inventory.model.Inventory;
import com.example.inventory.model.Warehouse;
import com.example.inventory.repository.InventoryRepository;
import com.example.inventory.repository.WarehouseRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {

    private final WarehouseRepository warehouses;
    private final InventoryRepository inventory;

    public DataSeeder(WarehouseRepository warehouses, InventoryRepository inventory) {
        this.warehouses = warehouses;
        this.inventory = inventory;
    }

    @Override
    public void run(String... args) {
        if (warehouses.count() > 0) return;

        // Mirrors backend's admin-seeded warehouses.
        Warehouse mumbai = warehouse("Mumbai", "Mumbai, MH");
        Warehouse ahmedabad = warehouse("Ahmedabad", "Ahmedabad, GJ");
        Warehouse delhi = warehouse("Delhi", "Delhi, DL");

        // Product ids 1-6 mirror quotation-service's seeded catalog (Enterprise Server,
        // Premium Support, Wireless Mouse, USB-C Hub, Running Shoes, Athletic Socks).
        stock(mumbai, 1L, 60);
        stock(ahmedabad, 1L, 25);
        stock(delhi, 1L, 10);

        stock(mumbai, 3L, 200);
        stock(ahmedabad, 3L, 150);
        stock(delhi, 3L, 50);

        stock(mumbai, 5L, 40);
        stock(delhi, 5L, 20);
    }

    private Warehouse warehouse(String name, String location) {
        Warehouse w = new Warehouse();
        w.setName(name);
        w.setLocation(location);
        return warehouses.save(w);
    }

    private void stock(Warehouse warehouse, Long productId, int quantity) {
        Inventory row = new Inventory();
        row.setWarehouseId(warehouse.getId());
        row.setProductId(productId);
        row.setQuantityOnHand(quantity);
        row.setQuantityReserved(0);
        inventory.save(row);
    }
}
