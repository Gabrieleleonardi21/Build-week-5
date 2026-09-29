package it.epicode.eventi.security;

import it.epicode.eventi.user.Role;
import it.epicode.eventi.user.User;
import it.epicode.eventi.user.UserStatus;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

/**
 * Utente autenticato come lo vede Spring Security. E' quello che finisce nella
 * sessione (spring_session_attributes): un record serializzabile e leggero,
 * mai l'entity JPA. Lo username e' l'email, come si aspetta CurrentUsers.
 *
 * isEnabled() resta true di proposito: lo stato si controlla in AuthService
 * dopo la password, cosi' un'email in attesa di verifica non si scopre
 * senza conoscere la password.
 */
public record AuthUser(UUID id, String email, String passwordHash, Role role, UserStatus status)
		implements UserDetails {

	public static AuthUser from(User user) {
		return new AuthUser(user.getId(), user.getEmail(), user.getPasswordHash(), user.getRole(), user.getStatus());
	}

	// L'hash serve solo durante authenticate(): in sessione non si salva.
	public AuthUser withoutPassword() {
		return new AuthUser(id, email, null, role, status);
	}

	@Override
	public Collection<? extends GrantedAuthority> getAuthorities() {
		return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
	}

	@Override
	public String getPassword() {
		return passwordHash;
	}

	@Override
	public String getUsername() {
		return email;
	}
}
