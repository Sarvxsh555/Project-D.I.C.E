package com.example.login.admin;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/analytics")
public class AnalyticsController {

    @GetMapping("/summary")
    public Map<String, Object> summary() {
        return Map.of(
                "stats", List.of(
                        Map.of("label", "Revenue (30d)", "value", "$482,300"),
                        Map.of("label", "Quotes generated", "value", "1,204"),
                        Map.of("label", "Orders placed", "value", "918"),
                        Map.of("label", "Approval rate", "value", "87%")),
                "discountDistribution", List.of(
                        Map.of("label", "0-10%", "value", 42),
                        Map.of("label", "10-20%", "value", 31),
                        Map.of("label", "20-30%", "value", 18),
                        Map.of("label", "30%+", "value", 9)),
                "productPerformance", List.of(
                        Map.of("label", "Wireless Mouse", "value", 92),
                        Map.of("label", "Running Shoes", "value", 78),
                        Map.of("label", "Stainless Steel Kettle", "value", 54),
                        Map.of("label", "A4 Copy Paper", "value", 40)),
                "salesPerformance", List.of(
                        Map.of("label", "North Region", "value", 88),
                        Map.of("label", "West Region", "value", 73),
                        Map.of("label", "South Region", "value", 65),
                        Map.of("label", "East Region", "value", 58)));
    }
}
