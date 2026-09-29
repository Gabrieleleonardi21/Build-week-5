package it.epicode.eventi.social;

import it.epicode.eventi.user.UserStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

public interface FriendshipRepository extends JpaRepository<Friendship, UUID> {

	/** Amicizia con entrambi gli utenti gia' caricati (serve alla chat per il controllo e il push). */
	@Query("select f from Friendship f join fetch f.requester join fetch f.addressee where f.id = :id")
	Optional<Friendship> findWithUsersById(UUID id);

	/** La riga della coppia, in qualunque direzione: per l'indice uq_friendships_pair ce n'e' al massimo una (D12). */
	@Query("""
			select f from Friendship f
			where (f.requester.id = :a and f.addressee.id = :b)
			   or (f.requester.id = :b and f.addressee.id = :a)
			""")
	Optional<Friendship> findBetween(UUID a, UUID b);

	/** Amici di un utente (ACCEPTED), esclusi quelli disattivati o anonimizzati. */
	@Query(value = """
			select f from Friendship f join fetch f.requester r join fetch f.addressee a
			where f.status = :status
			  and ((r.id = :me and a.status = :active) or (a.id = :me and r.status = :active))
			order by f.respondedAt desc
			""", countQuery = """
			select count(f) from Friendship f join f.requester r join f.addressee a
			where f.status = :status
			  and ((r.id = :me and a.status = :active) or (a.id = :me and r.status = :active))
			""")
	Page<Friendship> findFriends(UUID me, FriendshipStatus status, UserStatus active, Pageable pageable);

	/** Richieste ricevute ancora da decidere (l'utente e' l'addressee). */
	@Query(value = """
			select f from Friendship f join fetch f.requester r left join fetch f.event
			where f.addressee.id = :me and f.status = :status and r.status = :active
			order by f.createdAt desc
			""", countQuery = """
			select count(f) from Friendship f join f.requester r
			where f.addressee.id = :me and f.status = :status and r.status = :active
			""")
	Page<Friendship> findReceived(UUID me, FriendshipStatus status, UserStatus active, Pageable pageable);

	/** Richieste inviate ancora in attesa di risposta (l'utente e' il requester). */
	@Query(value = """
			select f from Friendship f join fetch f.addressee a left join fetch f.event
			where f.requester.id = :me and f.status = :status and a.status = :active
			order by f.createdAt desc
			""", countQuery = """
			select count(f) from Friendship f join f.addressee a
			where f.requester.id = :me and f.status = :status and a.status = :active
			""")
	Page<Friendship> findSent(UUID me, FriendshipStatus status, UserStatus active, Pageable pageable);
}
