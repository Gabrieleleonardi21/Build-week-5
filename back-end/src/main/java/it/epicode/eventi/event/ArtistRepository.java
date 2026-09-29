package it.epicode.eventi.event;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

public interface ArtistRepository extends JpaRepository<Artist, UUID> {

	// Base del find-or-create case-insensitive (D07).
	Optional<Artist> findByNameIgnoreCase(String name);

	// Containing fa l'escape di % e _: q = "" restituisce tutti gli artisti.
	Page<Artist> findByNameContainingIgnoreCaseOrderByNameAsc(String q, Pageable pageable);

	// In quante scalette compare: se > 0 non si cancella (vedi ArtistService.delete).
	@Query("select count(ea) from EventArtist ea where ea.artist.id = :artistId")
	long countLineupEntries(UUID artistId);
}
