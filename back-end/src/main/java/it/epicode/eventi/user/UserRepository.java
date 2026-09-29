package it.epicode.eventi.user;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {

	// L'email passata deve essere gia' normalizzata (trim + minuscolo, D05).
	Optional<User> findByEmail(String email);

	boolean existsByEmail(String email);

	boolean existsByRole(Role role);

	/**
	 * Ricerca tra utenti per chi e' loggato (es. per chiedere l'amicizia): solo per nome
	 * e cognome, solo account attivi e non anonimizzati.
	 */
	@Query("""
			select u from User u
			where u.status = :status
			  and u.anonymizedAt is null
			  and lower(concat(u.firstName, ' ', u.lastName)) like lower(concat('%', :q, '%'))
			order by u.firstName, u.lastName
			""")
	Page<User> searchDirectory(UserStatus status, String q, Pageable pageable);

	/**
	 * Ricerca per l'area admin: q su email o nome e cognome (stringa vuota = tutti),
	 * role e status facoltativi (null = nessun filtro). Dal piu' recente.
	 */
	@Query("""
			select u from User u
			where (lower(u.email) like lower(concat('%', :q, '%'))
			       or lower(concat(u.firstName, ' ', u.lastName)) like lower(concat('%', :q, '%')))
			  and (:role is null or u.role = :role)
			  and (:status is null or u.status = :status)
			order by u.createdAt desc
			""")
	Page<User> search(String q, Role role, UserStatus status, Pageable pageable);
}
