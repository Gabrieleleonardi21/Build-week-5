package it.epicode.eventi.event;

import it.epicode.eventi.common.exception.ConflictException;
import it.epicode.eventi.common.exception.NotFoundException;
import it.epicode.eventi.event.dto.ArtistRequest;
import it.epicode.eventi.event.dto.ArtistResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Artisti condivisi tra piu' eventi (D07). Leggerli e' pubblico; li crea chi e' loggato,
 * anche indirettamente dalla scaletta di un evento. Non hanno un proprietario:
 * modificarli e cancellarli possono solo MODERATOR e SUPERADMIN (vedi ArtistController).
 */
@Service
public class ArtistService {

	private static final int MAX_PAGE_SIZE = 50;

	private final ArtistRepository artistRepository;

	public ArtistService(ArtistRepository artistRepository) {
		this.artistRepository = artistRepository;
	}

	@Transactional(readOnly = true)
	public Page<ArtistResponse> search(String q, int page, int size) {
		PageRequest request = PageRequest.of(Math.max(page, 0), Math.clamp(size, 1, MAX_PAGE_SIZE));
		String query = q == null ? "" : q.trim();
		return artistRepository.findByNameContainingIgnoreCaseOrderByNameAsc(query, request)
				.map(ArtistResponse::from);
	}

	@Transactional(readOnly = true)
	public ArtistResponse get(UUID id) {
		return ArtistResponse.from(find(id));
	}

	@Transactional
	public ArtistResponse create(ArtistRequest req) {
		String name = req.name().trim();
		if (artistRepository.findByNameIgnoreCase(name).isPresent()) {
			throw new ConflictException("Artista gia' presente");
		}
		// Due creazioni simultanee dello stesso nome: la seconda si ferma su uq_artists_name_ci (409).
		Artist artist = new Artist(name);
		apply(artist, req);
		artistRepository.save(artist);
		return ArtistResponse.from(artist);
	}

	@Transactional
	public ArtistResponse update(UUID id, ArtistRequest req) {
		Artist artist = find(id);
		String name = req.name().trim();
		boolean nameTaken = artistRepository.findByNameIgnoreCase(name)
				.filter(other -> !other.getId().equals(id))
				.isPresent();
		if (nameTaken) {
			throw new ConflictException("Esiste gia' un artista con questo nome");
		}
		artist.setName(name);
		apply(artist, req);
		return ArtistResponse.from(artist);
	}

	/**
	 * Moderazione: cancella un artista che non e' in nessuna scaletta.
	 * Se lo fosse, ON DELETE CASCADE lo toglierebbe in silenzio dagli eventi di altri
	 * utenti: in quel caso si corregge con update invece di cancellarlo.
	 */
	@Transactional
	public void delete(UUID id) {
		Artist artist = find(id);
		if (artistRepository.countLineupEntries(id) > 0) {
			throw new ConflictException("L'artista e' nella scaletta di almeno un evento: modificalo invece di cancellarlo");
		}
		artistRepository.delete(artist);
	}

	/** Artista con quel nome, ignorando le maiuscole; se non c'e' lo crea con il solo nome (D07). */
	@Transactional
	public Artist findOrCreate(String rawName) {
		String name = rawName.trim();
		return artistRepository.findByNameIgnoreCase(name)
				.orElseGet(() -> artistRepository.save(new Artist(name)));
	}

	private Artist find(UUID id) {
		return artistRepository.findById(id)
				.orElseThrow(() -> new NotFoundException("Artista non trovato"));
	}

	private static void apply(Artist artist, ArtistRequest req) {
		artist.setGenre(blankToNull(req.genre()));
		artist.setBio(blankToNull(req.bio()));
		artist.setImageUrl(blankToNull(req.imageUrl()));
	}

	private static String blankToNull(String value) {
		return value == null || value.isBlank() ? null : value.trim();
	}
}
