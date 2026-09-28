package it.epicode.eventi.user;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {

	// L'email passata deve essere gia' normalizzata (trim + minuscolo, D05).
	Optional<User> findByEmail(String email);

	boolean existsByEmail(String email);
}
