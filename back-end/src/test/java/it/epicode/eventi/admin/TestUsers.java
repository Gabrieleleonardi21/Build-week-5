package it.epicode.eventi.admin;

import it.epicode.eventi.user.Role;
import it.epicode.eventi.user.User;
import it.epicode.eventi.user.UserStatus;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

/** User veri (non mock): i test controllano che ruolo e stato cambino davvero. */
final class TestUsers {

	private TestUsers() {
	}

	static User user(String email, Role role, UserStatus status) {
		User u = new User(email, "$2a$04$hash", "Nome", "Cognome", LocalDate.of(2000, 1, 1), OffsetDateTime.now());
		// L'id lo genera Hibernate al salvataggio: qui non c'e' database.
		ReflectionTestUtils.setField(u, "id", UUID.randomUUID());
		u.setRole(role);
		u.setStatus(status);
		if (status == UserStatus.ACTIVE) {
			u.setEmailVerifiedAt(OffsetDateTime.now());
		}
		return u;
	}
}
