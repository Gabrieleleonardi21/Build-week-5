package it.epicode.eventi;

import it.epicode.eventi.common.config.DatabaseUrl;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class EventiApplication {

	public static void main(String[] args) {
		// Su Render le credenziali arrivano in DATABASE_URL, formato non JDBC:
		// la traduzione va fatta prima che parta il contesto Spring.
		DatabaseUrl.applicaSePresente();

		SpringApplication.run(EventiApplication.class, args);
	}
}
