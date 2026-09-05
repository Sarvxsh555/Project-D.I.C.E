package com.example.login.admin;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/discount-rules")
public class DiscountRuleController extends AdminCrudController<DiscountRule> {

    private final DiscountRuleRepository repository;

    public DiscountRuleController(DiscountRuleRepository repository) {
        this.repository = repository;
    }

    @Override
    protected JpaRepository<DiscountRule, Long> repository() {
        return repository;
    }
}
