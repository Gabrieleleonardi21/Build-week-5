package it.epicode.eventi.event;

import it.epicode.eventi.event.dto.ArtistRequest;
import it.epicode.eventi.event.dto.ArtistResponse;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Elenco artisti pubblico (Parte 5). Creare richiede login; modificare solo ADMIN,
 * perche' un artista e' condiviso tra gli eventi di utenti diversi.
 */
@RestController
public class ArtistController {

	private final ArtistService artistService;

	public ArtistController(ArtistService artistService) {
		this.artistService = artistService;
	}

	@GetMapping("/api/artists")
	public Page<ArtistResponse> search(@RequestParam(required = false) String q,
			@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
		return artistService.search(q, page, size);
	}

	@GetMapping("/api/artists/{id}")
	public ArtistResponse get(@PathVariable UUID id) {
		return artistService.get(id);
	}

	@PostMapping("/api/artists")
	@ResponseStatus(HttpStatus.CREATED)
	public ArtistResponse create(@Valid @RequestBody ArtistRequest req) {
		return artistService.create(req);
	}

	@PutMapping("/api/artists/{id}")
	@PreAuthorize("hasRole('ADMIN')")
	public ArtistResponse update(@PathVariable UUID id, @Valid @RequestBody ArtistRequest req) {
		return artistService.update(id, req);
	}
}
