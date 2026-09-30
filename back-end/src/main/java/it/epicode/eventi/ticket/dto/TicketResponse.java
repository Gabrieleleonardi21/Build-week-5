package it.epicode.eventi.ticket.dto;

import it.epicode.eventi.event.dto.EventSummaryResponse;
import it.epicode.eventi.ticket.Ticket;
import it.epicode.eventi.ticket.TicketStatus;

import java.time.OffsetDateTime;
import java.util.UUID;

/** Ticket del partecipante, con l'evento nello stesso formato delle card della lista eventi. */
public record TicketResponse(
		UUID id,
		String code,
		TicketStatus status,
		OffsetDateTime issuedAt,
		EventSummaryResponse event) {

	public static TicketResponse from(Ticket ticket) {
		return new TicketResponse(ticket.getId(), ticket.getCode(), ticket.getStatus(), ticket.getIssuedAt(),
				EventSummaryResponse.from(ticket.getEvent()));
	}
}
