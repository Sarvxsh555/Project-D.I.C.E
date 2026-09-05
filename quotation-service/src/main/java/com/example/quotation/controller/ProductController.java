package com.example.quotation.controller;

import com.example.quotation.model.Product;
import com.example.quotation.repository.ProductRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductRepository repository;

    public ProductController(ProductRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<Product> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String category) {
        return repository.findAll().stream()
                .filter(p -> q == null || q.isBlank() || p.getName().toLowerCase().contains(q.toLowerCase()))
                .filter(p -> category == null || category.isBlank() || category.equals(p.getCategory()))
                .toList();
    }
}
