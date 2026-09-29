package it.epicode.eventi.common;

import it.epicode.eventi.common.exception.NotFoundException;
import it.epicode.eventi.user.User;
import it.epicode.eventi.user.UserRepository;
import org.springframework.stereotype.Component;

import java.security.Principal;
import java.util.Locale;

/**
 * Utente autenticato a partire dal Principal di Spring Security (HTTP e STOMP).
 * Il nome del Principal e' lo username, cioe' l'email: cosi' il codice non dipende
 * da come il modulo auth implementa UserDetails.
 */
@Component
public class CurrentUsers {

	private final UserRepository userRepository;

	public CurrentUsers(UserRepository userRepository) {
		this.userRepository = userRepository;
	}

	public User require(Principal principal) {
		String email = principal.getName().trim().toLowerCase(Locale.ROOT);
		return userRepository.findByEmail(email)
				.orElseThrow(() -> new NotFoundException("Utente non trovato"));
	}
}
