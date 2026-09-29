package it.epicode.eventi.event;

import it.epicode.eventi.ticket.TicketStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.OffsetDateTime;
import java.util.UUID;

public interface EventRepository extends JpaRepository<Event, UUID> {

	/**
	 * Lista pubblica: eventi nello stato indicato non ancora finiti (ends_at, o starts_at se manca).
	 * q e city arrivano gia' normalizzati dal service: stringa vuota = nessun filtro.
	 */
	@Query("""
			select e from Event e
			where e.status = :status
			  and coalesce(e.endsAt, e.startsAt) >= :now
			  and lower(e.title) like lower(concat('%', :q, '%'))
			  and (:city = '' or lower(e.city) = lower(:city))
			order by e.startsAt
			""")
	Page<Event> search(EventStatus status, OffsetDateTime now, String q, String city, Pageable pageable);

	// Usa l'indice idx_events_owner.
	Page<Event> findByOwnerIdOrderByStartsAtDesc(UUID ownerId, Pageable pageable);

	/** Partecipanti = ticket nello stato indicato (D09). Serve per capienza e cancellazione. */
	@Query("select count(t) from Ticket t where t.event.id = :eventId and t.status = :status")
	long countTickets(UUID eventId, TicketStatus status);
}
