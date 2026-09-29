package it.epicode.eventi.social;

import it.epicode.eventi.common.exception.BadRequestException;
import it.epicode.eventi.common.exception.ConflictException;
import it.epicode.eventi.common.exception.ForbiddenException;
import it.epicode.eventi.common.exception.NotFoundException;
import it.epicode.eventi.event.Event;
import it.epicode.eventi.event.EventRepository;
import it.epicode.eventi.notification.NotificationService;
import it.epicode.eventi.notification.NotificationType;
import it.epicode.eventi.social.dto.FriendRequestResponse;
import it.epicode.eventi.social.dto.FriendResponse;
import it.epicode.eventi.ticket.TicketRepository;
import it.epicode.eventi.ticket.TicketStatus;
import it.epicode.eventi.user.User;
import it.epicode.eventi.user.UserRepository;
import it.epicode.eventi.user.UserStatus;
import it.epicode.eventi.user.dto.UserSummaryResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Amicizie (Parte 3, D12).
 * Si diventa amici solo tra partecipanti dello stesso evento: la richiesta resta
 * PENDING finche' il destinatario non la accetta o la rifiuta. Una sola riga per
 * coppia: una richiesta rifiutata o un'amicizia tolta possono tornare PENDING.
 * Togliere un amico non cancella la riga (REMOVED): la chat resta in bandeja.
 * Bandeja e storico: ChatHistoryService; invio in tempo reale: ChatMessagingService.
 */
@Service
public class FriendshipService {

	private static final int MAX_PAGE_SIZE = 50;

	private final FriendshipRepository friendshipRepository;
	private final ChatMessageRepository messageRepository;
	private final UserRepository userRepository;
	private final EventRepository eventRepository;
	private final TicketRepository ticketRepository;
	private final NotificationService notificationService;

	public FriendshipService(FriendshipRepository friendshipRepository, ChatMessageRepository messageRepository,
			UserRepository userRepository, EventRepository eventRepository, TicketRepository ticketRepository,
			NotificationService notificationService) {
		this.friendshipRepository = friendshipRepository;
		this.messageRepository = messageRepository;
		this.userRepository = userRepository;
		this.eventRepository = eventRepository;
		this.ticketRepository = ticketRepository;
		this.notificationService = notificationService;
	}

	// ---------- richieste ----------

	@Transactional
	public FriendRequestResponse request(User me, UUID addresseeId, UUID eventId) {
		if (me.getId().equals(addresseeId)) {
			throw new BadRequestException("Non puoi chiedere l'amicizia a te stesso");
		}
		User addressee = userRepository.findById(addresseeId)
				.filter(u -> u.getStatus() == UserStatus.ACTIVE && u.getAnonymizedAt() == null)
				.orElseThrow(() -> new NotFoundException("Utente non trovato"));
		Event event = eventRepository.findById(eventId)
				.orElseThrow(() -> new NotFoundException("Evento non trovato"));
		if (!takesPart(event, me) || !takesPart(event, addressee)) {
			throw new ForbiddenException("Potete diventare amici solo se partecipate entrambi all'evento");
		}

		Friendship friendship = friendshipRepository.findBetween(me.getId(), addresseeId)
				.map(existing -> reopen(existing, me, addressee, event))
				.orElseGet(() -> new Friendship(me, addressee, event));
		// Due richieste incrociate nello stesso istante: la seconda si ferma su uq_friendships_pair (409).
		friendshipRepository.saveAndFlush(friendship);

		notificationService.notify(addressee, event, NotificationType.FRIEND_REQUEST, "Nuova richiesta di amicizia",
				fullName(me) + " ti ha inviato una richiesta di amicizia");
		return FriendRequestResponse.from(friendship, addressee);
	}

	/** Solo il destinatario, solo se ancora PENDING. Da qui la chat e' aperta. */
	@Transactional
	public FriendResponse accept(UUID friendshipId, User me) {
		Friendship f = findPendingForAddressee(friendshipId, me);
		f.setStatus(FriendshipStatus.ACCEPTED);
		f.setRespondedAt(OffsetDateTime.now());
		notificationService.notify(f.getRequester(), f.getEvent(), NotificationType.FRIEND_ACCEPTED,
				"Richiesta di amicizia accettata", fullName(me) + " ha accettato la tua richiesta di amicizia");
		return new FriendResponse(f.getId(), UserSummaryResponse.from(f.getRequester()), f.getRespondedAt(), 0);
	}

	/** Il rifiuto non viene notificato: chi l'ha inviata vede solo che la richiesta non e' piu' in attesa. */
	@Transactional
	public void reject(UUID friendshipId, User me) {
		Friendship f = findPendingForAddressee(friendshipId, me);
		f.setStatus(FriendshipStatus.REJECTED);
		f.setRespondedAt(OffsetDateTime.now());
	}

	/**
	 * Ritira una richiesta inviata oppure toglie un amico. Lo puo' fare solo uno dei due.
	 * Togliere un amico non cancella la riga: passa a REMOVED, cosi' lo storico della chat
	 * resta (ON DELETE CASCADE lo cancellerebbe) e i due possono ancora leggerlo, non scrivere.
	 * Una richiesta ritirata invece si cancella: non puo' avere messaggi.
	 */
	@Transactional
	public void remove(UUID friendshipId, User me) {
		Friendship f = findForMember(friendshipId, me);
		switch (f.getStatus()) {
			case ACCEPTED -> {
				f.setStatus(FriendshipStatus.REMOVED);
				f.setRespondedAt(OffsetDateTime.now());
			}
			case PENDING -> {
				if (!isMe(f.getRequester(), me)) {
					throw new BadRequestException("Una richiesta ricevuta si rifiuta, non si cancella");
				}
				friendshipRepository.delete(f);
			}
			case REJECTED, REMOVED -> throw new NotFoundException("Amicizia non trovata");
		}
	}

	// ---------- elenchi ----------

	@Transactional(readOnly = true)
	public Page<FriendResponse> friends(User me, int page, int size) {
		return friendshipRepository.findFriends(me.getId(), FriendshipStatus.ACCEPTED, UserStatus.ACTIVE,
				pageRequest(page, size)).map(f -> new FriendResponse(f.getId(), UserSummaryResponse.from(other(f, me)),
				f.getRespondedAt(), messageRepository.countByFriendshipIdAndSenderIdNotAndReadAtIsNull(f.getId(), me.getId())));
	}

	@Transactional(readOnly = true)
	public Page<FriendRequestResponse> received(User me, int page, int size) {
		return friendshipRepository.findReceived(me.getId(), FriendshipStatus.PENDING, UserStatus.ACTIVE,
				pageRequest(page, size)).map(f -> FriendRequestResponse.from(f, f.getRequester()));
	}

	@Transactional(readOnly = true)
	public Page<FriendRequestResponse> sent(User me, int page, int size) {
		return friendshipRepository.findSent(me.getId(), FriendshipStatus.PENDING, UserStatus.ACTIVE,
				pageRequest(page, size)).map(f -> FriendRequestResponse.from(f, f.getAddressee()));
	}

	// ---------- helper ----------

	/**
	 * Riga gia' esistente per la coppia (D12): si riapre come PENDING se era REJECTED o REMOVED,
	 * in qualunque momento e da parte di entrambi. Se tornano amici, la chat riprende con lo storico.
	 */
	private Friendship reopen(Friendship existing, User me, User addressee, Event event) {
		switch (existing.getStatus()) {
			case ACCEPTED -> throw new ConflictException("Siete gia' amici");
			case PENDING -> throw new ConflictException(isMe(existing.getRequester(), me)
					? "Richiesta gia' inviata"
					: "Ti ha gia' inviato una richiesta: accettala dalle richieste ricevute");
			case REJECTED, REMOVED -> {
			}
		}
		existing.setRequester(me);
		existing.setAddressee(addressee);
		existing.setEvent(event);
		existing.setStatus(FriendshipStatus.PENDING);
		existing.setRespondedAt(null);
		return existing;
	}

	// Partecipa = ticket VALID oppure e' il proprietario dell'evento.
	private boolean takesPart(Event event, User user) {
		return event.getOwner().getId().equals(user.getId())
				|| ticketRepository.existsByEventIdAndUserIdAndStatus(event.getId(), user.getId(), TicketStatus.VALID);
	}

	private Friendship findPendingForAddressee(UUID friendshipId, User me) {
		Friendship f = findForMember(friendshipId, me);
		if (f.getStatus() != FriendshipStatus.PENDING) {
			throw new ConflictException("La richiesta non e' piu' in attesa");
		}
		if (!isMe(f.getAddressee(), me)) {
			throw new ForbiddenException("Solo chi riceve la richiesta puo' rispondere");
		}
		return f;
	}

	// Chi non fa parte dell'amicizia riceve 404, non 403: non scopre nemmeno che esiste.
	private Friendship findForMember(UUID friendshipId, User me) {
		return friendshipRepository.findWithUsersById(friendshipId)
				.filter(f -> isMe(f.getRequester(), me) || isMe(f.getAddressee(), me))
				.orElseThrow(() -> new NotFoundException("Amicizia non trovata"));
	}

	private static User other(Friendship f, User me) {
		return isMe(f.getRequester(), me) ? f.getAddressee() : f.getRequester();
	}

	private static boolean isMe(User user, User me) {
		return user.getId().equals(me.getId());
	}

	private static String fullName(User user) {
		return user.getFirstName() + " " + user.getLastName();
	}

	private static PageRequest pageRequest(int page, int size) {
		return PageRequest.of(Math.max(page, 0), Math.clamp(size, 1, MAX_PAGE_SIZE));
	}
}
