package com.dice.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.util.List;

/**
 * Loads {@code database/seed/*.sql} on startup under the {@code dev} profile.
 *
 * <p>Kept out of Flyway on purpose: seed data is demo scaffolding, not schema,
 * and mixing the two makes it impossible to stand up a clean production
 * database. The scripts are ordered by dependency and written with
 * {@code ON CONFLICT DO NOTHING}, so restarting is harmless.
 */
@Component
@Profile("dev")
@RequiredArgsConstructor
@Slf4j
public class DevDataSeeder implements CommandLineRunner {

    /** Order matters — later files reference earlier ones. */
    private static final List<String> SCRIPTS = List.of(
            "db/seed/users.sql",
            "db/seed/customers.sql",
            "db/seed/products.sql",
            "db/seed/price_lists.sql",
            "db/seed/warehouses.sql",
            "db/seed/policies.sql",
            "db/seed/policy_discount_tiers.sql",
            "db/seed/co_purchase_pairs.sql",
            "db/seed/demo_deals.sql");

    private final DataSource dataSource;
    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        if (alreadySeeded()) {
            log.info("Seed data already present — skipping");
            return;
        }

        try (Connection connection = dataSource.getConnection()) {
            for (String script : SCRIPTS) {
                ClassPathResource resource = new ClassPathResource(script);
                if (!resource.exists()) {
                    log.warn("Seed script {} not found on the classpath — skipping", script);
                    continue;
                }
                ScriptUtils.executeSqlScript(connection, resource);
                log.info("Applied seed script {}", script);
            }
        } catch (Exception e) {
            // A broken seed must not stop the app: the schema is still valid and
            // an empty database is a recoverable state.
            log.error("Seeding failed; continuing with whatever loaded", e);
        }
    }

    private boolean alreadySeeded() {
        Long count = jdbcTemplate.queryForObject("select count(*) from customers", Long.class);
        return count != null && count > 0;
    }
}
