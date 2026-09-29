package it.epicode.eventi.security;

import org.springframework.session.FindByIndexNameSessionRepository;
import org.springframework.session.Session;
import org.springframework.stereotype.Component;

/**
 * Chiude tutte le sessioni di un utente (tabelle spring_session).
 * Il ruolo e lo stato sono copiati in sessione al login: senza questo, dopo
 * un cambio di ruolo o una disattivazione l'utente resterebbe dentro con i
 * vecchi permessi fino alla scadenza della sessione.
 */
@Component
public class UserSessions {

	private final FindByIndexNameSessionRepository<? extends Session> sessions;

	public UserSessions(FindByIndexNameSessionRepository<? extends Session> sessions) {
		this.sessions = sessions;
	}

	// Il nome del principal e' l'email (AuthUser.getUsername).
	public void invalidateAll(String email) {
		sessions.findByPrincipalName(email).keySet().forEach(sessions::deleteById);
	}

	/** Come invalidateAll, ma lascia aperta una sessione: es. quella da cui si e' appena cambiata la password. */
	public void invalidateAllExcept(String email, String keepSessionId) {
		sessions.findByPrincipalName(email).keySet().stream()
				.filter(id -> !id.equals(keepSessionId))
				.forEach(sessions::deleteById);
	}
}
