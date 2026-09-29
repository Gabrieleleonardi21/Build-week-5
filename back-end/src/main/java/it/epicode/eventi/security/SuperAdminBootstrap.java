package it.epicode.eventi.security;

import it.epicode.eventi.user.Role;
import it.epicode.eventi.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

/**
 * Crea il primo SUPERADMIN: senza, nessuno potrebbe assegnare i ruoli.
 * All'avvio, se nel database non c'e' ancora un SUPERADMIN, promuove l'utente
 * con l'email in SUPERADMIN_EMAIL (che deve essersi gia' registrato).
 * Quando un SUPERADMIN esiste non fa piu' nulla: cambiare la variabile dopo
 * non regala i permessi a nessuno. Gli altri ruoli li assegna il SUPERADMIN
 * da PATCH /api/admin/users/{id}/role.
 */
@Component
public class SuperAdminBootstrap implements ApplicationRunner {

	private static final Logger log = LoggerFactory.getLogger(SuperAdminBootstrap.class);

	private final UserRepository userRepository;
	private final String email;

	public SuperAdminBootstrap(UserRepository userRepository,
			@Value("${app.bootstrap.superadmin-email:}") String email) {
		this.userRepository = userRepository;
		this.email = email;
	}

	@Override
	@Transactional
	public void run(ApplicationArguments args) {
		if (email.isBlank() || userRepository.existsByRole(Role.SUPERADMIN)) {
			return;
		}
		userRepository.findByEmail(email.trim().toLowerCase(Locale.ROOT)).ifPresentOrElse(user -> {
			user.setRole(Role.SUPERADMIN);
			userRepository.save(user);
			log.info("superadmin_bootstrap user={}", user.getId());
		}, () -> log.warn("superadmin_bootstrap: nessun utente con l'email di SUPERADMIN_EMAIL; registrarsi e riavviare"));
	}
}
