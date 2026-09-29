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
}
