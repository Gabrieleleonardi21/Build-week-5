package it.epicode.eventi.user;

import it.epicode.eventi.common.exception.BadRequestException;
import it.epicode.eventi.common.exception.NotFoundException;
import it.epicode.eventi.user.dto.UserSummaryResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Elenco utenti per chiunque sia loggato: cercare qualcuno e aprirne il profilo.
 * Mostra solo account ACTIVE e non anonimizzati, con i dati di UserSummaryResponse.
 */
@Service
public class UserDirectoryService {

	// Almeno 2 caratteri: senza, basterebbe sfogliare le pagine per scaricare tutti gli utenti.
	static final int MIN_QUERY_LENGTH = 2;
	private static final int MAX_PAGE_SIZE = 50;

	private final UserRepository userRepository;

	public UserDirectoryService(UserRepository userRepository) {
		this.userRepository = userRepository;
	}

	@Transactional(readOnly = true)
	public Page<UserSummaryResponse> search(String q, int page, int size) {
		String query = q == null ? "" : q.trim();
		if (query.length() < MIN_QUERY_LENGTH) {
			throw new BadRequestException("Scrivi almeno " + MIN_QUERY_LENGTH + " caratteri per cercare");
		}
		PageRequest request = PageRequest.of(Math.max(page, 0), Math.clamp(size, 1, MAX_PAGE_SIZE));
		return userRepository.searchDirectory(UserStatus.ACTIVE, query, request).map(UserSummaryResponse::from);
	}

	// Utente disattivato, anonimizzato o inesistente: stessa risposta 404.
	@Transactional(readOnly = true)
	public UserSummaryResponse get(UUID id) {
		return userRepository.findById(id)
				.filter(u -> u.getStatus() == UserStatus.ACTIVE && u.getAnonymizedAt() == null)
				.map(UserSummaryResponse::from)
				.orElseThrow(() -> new NotFoundException("Utente non trovato"));
	}
}
