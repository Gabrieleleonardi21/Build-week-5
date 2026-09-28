package it.epicode.eventi;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Base dei test di integrazione: PostgreSQL vero in Docker, inizializzato con
 * lo stesso db/schema.sql del compose e di pgAdmin (niente H2).
 *
 * Il container e' static: uno solo per tutte le classi che estendono questa.
 * Senza Docker i test vengono saltati invece di fallire (utile su chi non l'ha installato).
 */
@SpringBootTest
@Testcontainers(disabledWithoutDocker = true)
public abstract class AbstractIntegrationTest {

	@Container
	@ServiceConnection
	static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:17")
			.withInitScript("db/schema.sql");
}
