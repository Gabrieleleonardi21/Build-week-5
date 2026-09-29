package it.epicode.eventi.ticket;

import java.util.UUID;

/**
 * Contratto tra ticket e mailing: il service di iscrizione lo pubblica dopo aver
 * salvato il ticket. Dopo il commit partono l'email del ticket e l'avviso al proprietario (D09).
 */
public record TicketCreated(UUID ticketId) {
}
