package it.epicode.eventi.admin;

import it.epicode.eventi.admin.dto.AdminUserResponse;
import it.epicode.eventi.common.exception.BadRequestException;
import it.epicode.eventi.common.exception.ForbiddenException;
import it.epicode.eventi.common.exception.NotFoundException;
import it.epicode.eventi.security.UserSessions;
import it.epicode.eventi.user.Role;
import it.epicode.eventi.user.User;
import it.epicode.eventi.user.UserRepository;
import it.epicode.eventi.user.UserStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Gestione degli account dall'area admin.
 * I permessi sono gia' filtrati in SecurityConfig (URL) e qui si ricontrollano:
 * se un giorno la regola sull'URL cambiasse per errore, il service resta sicuro.
 *
 * Regola comune: nessuno cambia il proprio ruolo o il proprio stato. Cosi' chi
 * agisce resta sempre SUPERADMIN attivo e non si puo' restare senza SUPERADMIN.
 */
@Service
public class AdminUserService {

	private static final Logger log = LoggerFactory.getLogger(AdminUserService.class);
	private static final int MAX_PAGE_SIZE = 50;

	private final UserRepository userRepository;
	private final UserSessions userSessions;

	public AdminUserService(UserRepository userRepository, UserSessions userSessions) {
		this.userRepository = userRepository;
		this.userSessions = userSessions;
	}

	@Transactional(readOnly = true)
	public Page<AdminUserResponse> search(String q, Role role, UserStatus status, int page, int size) {
		String query = q == null ? "" : q.trim();
		PageRequest request = PageRequest.of(Math.max(page, 0), Math.clamp(size, 1, MAX_PAGE_SIZE));
		return userRepository.search(query, role, status, request).map(AdminUserResponse::from);
	}

	@Transactional(readOnly = true)
	public AdminUserResponse get(UUID id) {
		return AdminUserResponse.from(find(id));
	}

	/** Solo SUPERADMIN. Le sessioni dell'utente si chiudono: al prossimo login ha il ruolo nuovo. */
	@Transactional
	public AdminUserResponse changeRole(UUID id, Role newRole, User me) {
		if (me.getRole() != Role.SUPERADMIN) {
			throw new ForbiddenException("Solo un SUPERADMIN puo' cambiare i ruoli");
		}
		User target = find(id);
		if (target.getId().equals(me.getId())) {
			throw new BadRequestException("Non puoi cambiare il tuo ruolo");
		}
		if (target.getAnonymizedAt() != null) {
			throw new BadRequestException("Account anonimizzato: non si puo' modificare");
		}
		Role oldRole = target.getRole();
		if (oldRole != newRole) {
			target.setRole(newRole);
			userSessions.invalidateAll(target.getEmail());
			log.info("role_changed target={} from={} to={} by={}", target.getId(), oldRole, newRole, me.getId());
		}
		return AdminUserResponse.from(target);
	}

	/**
	 * Disattiva o riattiva un account. Un MODERATOR gestisce solo gli account USER;
	 * un SUPERADMIN anche MODERATOR e altri SUPERADMIN.
	 */
	@Transactional
	public AdminUserResponse changeStatus(UUID id, UserStatus newStatus, User me) {
		if (!me.getRole().isAtLeast(Role.MODERATOR)) {
			throw new ForbiddenException("Operazione riservata ai moderatori");
		}
		User target = find(id);
		if (target.getId().equals(me.getId())) {
			throw new BadRequestException("Non puoi cambiare lo stato del tuo account");
		}
		if (me.getRole() != Role.SUPERADMIN && target.getRole() != Role.USER) {
			throw new ForbiddenException("Puoi gestire solo gli account con ruolo USER");
		}
		if (target.getAnonymizedAt() != null) {
			throw new BadRequestException("Account anonimizzato: non si puo' modificare");
		}

		switch (newStatus) {
			case DEACTIVATED -> {
				if (target.getStatus() != UserStatus.DEACTIVATED) {
					target.setStatus(UserStatus.DEACTIVATED);
					// Fuori subito: senza, resterebbe loggato fino alla scadenza della sessione.
					userSessions.invalidateAll(target.getEmail());
					log.info("user_deactivated target={} by={}", target.getId(), me.getId());
				}
			}
			case ACTIVE -> {
				if (target.getStatus() == UserStatus.DEACTIVATED) {
					// Chi non aveva ancora confermato l'email torna a doverlo fare.
					target.setStatus(target.getEmailVerifiedAt() == null
							? UserStatus.PENDING_VERIFICATION : UserStatus.ACTIVE);
					log.info("user_reactivated target={} by={}", target.getId(), me.getId());
				}
			}
			case PENDING_VERIFICATION -> throw new BadRequestException("Stato ammesso: ACTIVE o DEACTIVATED");
		}
		return AdminUserResponse.from(target);
	}

	private User find(UUID id) {
		return userRepository.findById(id)
				.orElseThrow(() -> new NotFoundException("Utente non trovato"));
	}
}
