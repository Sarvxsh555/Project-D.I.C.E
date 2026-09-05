package com.example.login.admin;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/subscription-plans")
public class SubscriptionPlanController extends AdminCrudController<SubscriptionPlan> {

    private final SubscriptionPlanRepository repository;

    public SubscriptionPlanController(SubscriptionPlanRepository repository) {
        this.repository = repository;
    }

    @Override
    protected JpaRepository<SubscriptionPlan, Long> repository() {
        return repository;
    }
}
