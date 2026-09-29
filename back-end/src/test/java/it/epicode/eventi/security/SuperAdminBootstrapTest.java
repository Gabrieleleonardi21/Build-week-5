package it.epicode.eventi.security;

import it.epicode.eventi.user.Role;
import it.epicode.eventi.user.User;
import it.epicode.eventi.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SuperAdminBootstrapTest {

	@Mock UserRepository userRepository;

	@Test
	void noSuperadminYet_promotesUserWithConfiguredEmail() {
		User anna = new User("anna@mail.it", "$2a$04$hash", "Anna", "Rossi", LocalDate.of(2000, 1, 1), OffsetDateTime.now());
		when(userRepository.existsByRole(Role.SUPERADMIN)).thenReturn(false);
		when(userRepository.findByEmail("anna@mail.it")).thenReturn(Optional.of(anna));

		new SuperAdminBootstrap(userRepository, " Anna@Mail.it ").run(null);

		assertThat(anna.getRole()).isEqualTo(Role.SUPERADMIN);
		verify(userRepository).save(anna);
	}

	@Test
	void superadminAlreadyExists_doesNothing() {
		when(userRepository.existsByRole(Role.SUPERADMIN)).thenReturn(true);

		new SuperAdminBootstrap(userRepository, "anna@mail.it").run(null);

		verify(userRepository, never()).findByEmail(anyString());
		verify(userRepository, never()).save(any());
	}

	@Test
	void emailNotConfigured_doesNothing() {
		new SuperAdminBootstrap(userRepository, "").run(null);

		verify(userRepository, never()).existsByRole(any());
	}

	@Test
	void userNotRegisteredYet_doesNotFail() {
		when(userRepository.existsByRole(Role.SUPERADMIN)).thenReturn(false);
		when(userRepository.findByEmail("anna@mail.it")).thenReturn(Optional.empty());

		new SuperAdminBootstrap(userRepository, "anna@mail.it").run(null);

		verify(userRepository, never()).save(any());
	}
}
