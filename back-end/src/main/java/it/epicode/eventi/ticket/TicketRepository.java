package it.epicode.eventi.ticket;

import it.epicode.eventi.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TicketRepository extends JpaRepository<Ticket, UUID> {

	/** Possessori di ticket nello stato indicato: sono i partecipanti dell'evento (D09, §6.5). */
	@Query("""
			select t.user from Ticket t
			where t.event.id = :eventId and t.status = :status
			order by t.user.lastName, t.user.firstName
			""")
	List<User> findHolders(UUID eventId, TicketStatus status);

	/** Tutto il necessario per le email: evento, proprietario e partecipante in una query. */
	@Query("""
			select t from Ticket t
			join fetch t.event e join fetch e.owner join fetch t.user
			where t.id = :id
			""")
	Optional<Ticket> findWithDetailsById(UUID id);

	// Ticket la cui email non e' partita: li riprende il job di reinvio.
	List<Ticket> findTop50ByEmailSentAtIsNullAndIssuedAtBefore(OffsetDateTime before);

	@Modifying
	@Transactional
	@Query("update Ticket t set t.emailSentAt = :sentAt where t.id = :id")
	void markEmailSent(UUID id, OffsetDateTime sentAt);
}
