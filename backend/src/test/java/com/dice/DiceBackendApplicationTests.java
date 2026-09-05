package com.dice;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

// `test` profile points at in-memory H2 (see application.yml) so this needs
// no Postgres container — the base profile targets a real Postgres host.
@SpringBootTest
@ActiveProfiles("test")
class DiceBackendApplicationTests {

	@Test
	void contextLoads() {
	}

}
