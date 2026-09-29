package it.epicode.eventi.social;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

public interface FriendshipRepository extends JpaRepository<Friendship, UUID> {

	/** Amicizia con entrambi gli utenti gia' caricati (serve alla chat per il controllo e il push). */
	@Query("select f from Friendship f join fetch f.requester join fetch f.addressee where f.id = :id")
	Optional<Friendship> findWithUsersById(UUID id);
}
