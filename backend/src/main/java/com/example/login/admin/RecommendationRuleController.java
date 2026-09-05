package com.example.login.admin;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/recommendation-rules")
public class RecommendationRuleController extends AdminCrudController<RecommendationRule> {

    private final RecommendationRuleRepository repository;

    public RecommendationRuleController(RecommendationRuleRepository repository) {
        this.repository = repository;
    }

    @Override
    protected JpaRepository<RecommendationRule, Long> repository() {
        return repository;
    }
}
