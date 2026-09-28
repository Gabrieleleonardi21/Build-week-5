package it.epicode.base.config;

import java.net.URI;

/**
 * Render consegna il database in una variabile sola, DATABASE_URL, scritta cosi':
 *
 *     postgresql://utente:password@host:5432/nome_db
 *
 * Il driver JDBC pretende invece tre informazioni separate e un indirizzo che
 * comincia con jdbc:postgresql://, senza credenziali dentro. Nessuno fa la
 * conversione al posto nostro: Spring Boot non interpreta DATABASE_URL.
 *
 * Qui la si fa a mano e si scrive il risultato nelle system property, che hanno
 * la precedenza su application.yml. In locale la variabile non esiste, il metodo
 * non fa niente e restano validi i valori del file.
 */
public final class DatabaseUrl {

	private DatabaseUrl() {
	}

	public static void applicaSePresente() {
		String grezzo = System.getenv("DATABASE_URL");
		if (grezzo == null || grezzo.isBlank()) {
			return;
		}
		if (grezzo.startsWith("jdbc:")) {
			// Qualcuno l'ha gia' scritta nel formato giusto: si usa com'e'.
			System.setProperty("spring.datasource.url", grezzo);
			return;
		}

		URI uri = URI.create(grezzo.trim());
		String[] credenziali = uri.getUserInfo() == null ? new String[0] : uri.getUserInfo().split(":", 2);
		int porta = uri.getPort() == -1 ? 5432 : uri.getPort();

		// sslmode=require: la connessione interna di Render non lo chiederebbe, ma
		// quella esterna si', e lo stesso indirizzo va bene in entrambi i casi.
		String jdbc = "jdbc:postgresql://%s:%d%s?sslmode=require".formatted(uri.getHost(), porta, uri.getPath());

		System.setProperty("spring.datasource.url", jdbc);
		if (credenziali.length > 0) {
			System.setProperty("spring.datasource.username", credenziali[0]);
		}
		if (credenziali.length > 1) {
			System.setProperty("spring.datasource.password", credenziali[1]);
		}

		// La password non si stampa mai nei log: i log di Render sono leggibili a
		// chiunque abbia accesso al progetto.
		System.out.println("[database] DATABASE_URL tradotta in " + jdbc);
	}
}
