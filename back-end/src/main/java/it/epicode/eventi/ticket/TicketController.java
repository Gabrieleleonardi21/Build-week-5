package it.epicode.eventi.ticket;

import it.epicode.eventi.common.CurrentUsers;
import it.epicode.eventi.ticket.dto.ParticipantResponse;
import it.epicode.eventi.ticket.dto.TicketResponse;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.UUID;

/**
 * Iscrizioni agli eventi: tutte le rotte richiedono login. Le GET sotto /api/events/**
 * sono pubbliche, per questo SecurityConfig protegge a parte participants e tickets.
 * Il ticket si individua da evento + utente loggato: nessun id di ticket nell'URL.
 */
@RestController
public class TicketController {

	private final TicketService ticketService;
	private final CurrentUsers currentUsers;

	public TicketController(TicketService ticketService, CurrentUsers currentUsers) {
		this.ticketService = ticketService;
		this.currentUsers = currentUsers;
	}

	@PostMapping("/api/events/{eventId}/tickets")
	@ResponseStatus(HttpStatus.CREATED)
	public TicketResponse join(Principal principal, @PathVariable UUID eventId) {
		return ticketService.join(eventId, currentUsers.require(principal));
	}

	@GetMapping("/api/events/{eventId}/tickets/me")
	public TicketResponse myTicket(Principal principal, @PathVariable UUID eventId) {
		return ticketService.myTicket(eventId, currentUsers.require(principal));
	}

	@DeleteMapping("/api/events/{eventId}/tickets/me")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void leave(Principal principal, @PathVariable UUID eventId) {
		ticketService.leave(eventId, currentUsers.require(principal));
	}

	@GetMapping("/api/events/{eventId}/participants")
	public Page<ParticipantResponse> participants(Principal principal, @PathVariable UUID eventId,
			@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
		return ticketService.participants(eventId, currentUsers.require(principal), page, size);
	}

	@GetMapping("/api/me/tickets")
	public Page<TicketResponse> myTickets(Principal principal,
			@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
		return ticketService.myTickets(currentUsers.require(principal), page, size);
	}
}
