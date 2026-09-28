package it.epicode.eventi;

import org.junit.jupiter.api.Test;

/**
 * Se il contesto parte, ddl-auto=validate ha confermato che ogni entity
 * combacia con schema.sql. Va rilanciato dopo ogni modifica a entity o schema.
 */
class SchemaValidationTest extends AbstractIntegrationTest {

	@Test
	void contextLoads_withSchemaSql_entitiesMatchTables() {
		// Nessuna asserzione: il fallimento sarebbe un errore di avvio del contesto.
	}
}
