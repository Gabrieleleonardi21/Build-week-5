package it.epicode.eventi.security;

import it.epicode.eventi.user.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

/** Carica l'utente per il login. L'email arriva gia' normalizzata da AuthService (D05). */
@Service
public class AppUserDetailsService implements UserDetailsService {

	private final UserRepository userRepository;

	public AppUserDetailsService(UserRepository userRepository) {
		this.userRepository = userRepository;
	}

	@Override
	public UserDetails loadUserByUsername(String email) {
		return userRepository.findByEmail(email)
				.map(AuthUser::from)
				.orElseThrow(() -> new UsernameNotFoundException("Utente non trovato"));
	}
}
