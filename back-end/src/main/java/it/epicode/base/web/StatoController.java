package it.epicode.base.web;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

/**
 * Endpoint di prova: conferma dal browser che BE e database rispondono.
 * Da qui si parte ad aggiungere i propri controller.
 */
@RestController
public class StatoController {

	private final JdbcTemplate jdbc;

	public StatoController(JdbcTemplate jdbc) {
		this.jdbc = jdbc;
	}

	@GetMapping("/api/stato")
	public Map<String, Object> stato() {
		String database = jdbc.queryForObject("SELECT current_database()", String.class);
		return Map.of(
				"servizio", "attivo",
				"database", database == null ? "sconosciuto" : database,
				"ora", Instant.now().toString());
	}
}
