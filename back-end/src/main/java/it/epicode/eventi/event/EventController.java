package it.epicode.eventi.event;

import it.epicode.eventi.common.CurrentUsers;
import it.epicode.eventi.event.dto.EventPinResponse;
import it.epicode.eventi.event.dto.EventRequest;
import it.epicode.eventi.event.dto.EventResponse;
import it.epicode.eventi.event.dto.EventSummaryResponse;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

/**
 * Le GET su /api/events/** sono pubbliche (mappa pubblica, Parte 5, vedi SecurityConfig);
 * le scritture richiedono login e il controllo di proprieta' e' in EventService.
 * "I miei eventi" sta sotto /api/me: sotto /api/events sarebbe una GET pubblica, senza utente.
 */
@RestController
public class EventController {

	private final EventService eventService;
	private final CurrentUsers currentUsers;

	public EventController(EventService eventService, CurrentUsers currentUsers) {
		this.eventService = eventService;
		this.currentUsers = currentUsers;
	}

	@GetMapping("/api/events")
	public Page<EventSummaryResponse> search(@RequestParam(required = false) String q,
			@RequestParam(required = false) String city,
			@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
		return eventService.search(q, city, page, size);
	}

	@GetMapping("/api/events/map")
	public List<EventPinResponse> map(@RequestParam(required = false) String q,
			@RequestParam(required = false) String city) {
		return eventService.map(q, city);
	}

	@GetMapping("/api/events/{id}")
	public EventResponse get(@PathVariable UUID id) {
		return eventService.get(id);
	}

	@GetMapping("/api/me/events")
	public Page<EventSummaryResponse> mine(Principal principal,
			@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
		return eventService.mine(currentUsers.require(principal), page, size);
	}

	@PostMapping("/api/events")
	@ResponseStatus(HttpStatus.CREATED)
	public EventResponse create(Principal principal, @Valid @RequestBody EventRequest req) {
		return eventService.create(currentUsers.require(principal), req);
	}

	@PutMapping("/api/events/{id}")
	public EventResponse update(Principal principal, @PathVariable UUID id, @Valid @RequestBody EventRequest req) {
		return eventService.update(id, currentUsers.require(principal), req);
	}

	@PostMapping("/api/events/{id}/cancel")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void cancel(Principal principal, @PathVariable UUID id) {
		eventService.cancel(id, currentUsers.require(principal));
	}

	@DeleteMapping("/api/events/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void delete(Principal principal, @PathVariable UUID id) {
		eventService.delete(id, currentUsers.require(principal));
	}
}
