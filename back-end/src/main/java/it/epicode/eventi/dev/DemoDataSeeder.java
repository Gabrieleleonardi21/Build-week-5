package it.epicode.eventi.dev;

import it.epicode.eventi.event.Artist;
import it.epicode.eventi.event.ArtistRepository;
import it.epicode.eventi.event.Event;
import it.epicode.eventi.event.EventArtist;
import it.epicode.eventi.event.EventImage;
import it.epicode.eventi.event.EventMarker;
import it.epicode.eventi.event.EventRepository;
import it.epicode.eventi.event.EventStatus;
import it.epicode.eventi.notification.Notification;
import it.epicode.eventi.notification.NotificationRepository;
import it.epicode.eventi.notification.NotificationType;
import it.epicode.eventi.social.ChatMessage;
import it.epicode.eventi.social.ChatMessageRepository;
import it.epicode.eventi.social.Friendship;
import it.epicode.eventi.social.FriendshipRepository;
import it.epicode.eventi.social.FriendshipStatus;
import it.epicode.eventi.ticket.Ticket;
import it.epicode.eventi.ticket.TicketRepository;
import it.epicode.eventi.user.Address;
import it.epicode.eventi.user.User;
import it.epicode.eventi.user.UserRepository;
import it.epicode.eventi.user.UserStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Riempie il database con dati demo, per vedere subito il frontend pieno.
 * Si attiva SOLO con SEED_DATA=true e SOLO se non ci sono ancora utenti: non tocca mai dati veri.
 * Scrive direttamente coi repository: niente email, niente eventi applicativi.
 */
@Component
@ConditionalOnProperty(name = "app.seed.enabled", havingValue = "true")
public class DemoDataSeeder implements ApplicationRunner {

	private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);
	private static final ZoneId ROME = ZoneId.of("Europe/Rome");
	// Foto segnaposto stabili (stesso seed = stessa foto); nessun file su Cloudinary da gestire.
	private static final String IMAGE_URL = "https://picsum.photos/seed/%s-%d/1200/800";
	private static final String ARTIST_IMAGE_URL = "https://picsum.photos/seed/artista-%s/600/600";

	private final UserRepository userRepository;
	private final ArtistRepository artistRepository;
	private final EventRepository eventRepository;
	private final TicketRepository ticketRepository;
	private final FriendshipRepository friendshipRepository;
	private final ChatMessageRepository chatMessageRepository;
	private final NotificationRepository notificationRepository;
	private final PasswordEncoder passwordEncoder;
	private final TransactionTemplate tx;
	private final String password;

	public DemoDataSeeder(UserRepository userRepository, ArtistRepository artistRepository,
			EventRepository eventRepository, TicketRepository ticketRepository,
			FriendshipRepository friendshipRepository, ChatMessageRepository chatMessageRepository,
			NotificationRepository notificationRepository, PasswordEncoder passwordEncoder,
			PlatformTransactionManager transactionManager, @Value("${app.seed.password}") String password) {
		this.userRepository = userRepository;
		this.artistRepository = artistRepository;
		this.eventRepository = eventRepository;
		this.ticketRepository = ticketRepository;
		this.friendshipRepository = friendshipRepository;
		this.chatMessageRepository = chatMessageRepository;
		this.notificationRepository = notificationRepository;
		this.passwordEncoder = passwordEncoder;
		this.tx = new TransactionTemplate(transactionManager);
		this.password = password;
	}

	@Override
	public void run(ApplicationArguments args) {
		if (userRepository.count() > 0) {
			log.info("seed_skipped: il database contiene gia' utenti");
			return;
		}
		// Tutto in una transazione: se qualcosa fallisce non resta un database a meta'.
		tx.executeWithoutResult(status -> seed());
		log.info("seed_done: {} utenti (password: app.seed.password), {} eventi, {} artisti",
				DemoData.USERS.size(), DemoData.EVENTS.size(), DemoData.ARTISTS.size());
		for (DemoData.UserSpec user : DemoData.USERS) {
			log.info("seed_user email={} role={}", user.email(), user.role());
		}
	}

	void seed() {
		Map<String, User> users = seedUsers();
		Map<String, Artist> artists = seedArtists();
		Map<String, Event> events = seedEvents(users, artists);
		seedTickets(users, events);
		seedFriendships(users, events);
		cancelEvent(events.get(DemoData.CANCELLED_EVENT));
	}

	private Map<String, User> seedUsers() {
		// Un solo hash per tutti: BCrypt costa ~250 ms a chiamata.
		String hash = passwordEncoder.encode(password);
		OffsetDateTime now = OffsetDateTime.now();
		Map<String, User> users = new HashMap<>();
		for (DemoData.UserSpec spec : DemoData.USERS) {
			User user = new User(spec.email(), hash, spec.firstName(), spec.lastName(),
					LocalDate.of(spec.birthYear(), 5, 14), now);
			user.setRole(spec.role());
			user.setStatus(UserStatus.ACTIVE);
			user.setEmailVerifiedAt(now);
			Address address = new Address();
			address.setCity(spec.city());
			user.setAddress(address);
			users.put(spec.email(), userRepository.save(user));
		}
		return users;
	}

	private Map<String, Artist> seedArtists() {
		Map<String, Artist> artists = new HashMap<>();
		for (DemoData.ArtistSpec spec : DemoData.ARTISTS) {
			Artist artist = new Artist(spec.name());
			artist.setGenre(spec.genre());
			artist.setBio(spec.bio());
			artist.setImageUrl(ARTIST_IMAGE_URL.formatted(slug(spec.name())));
			artists.put(spec.name(), artistRepository.save(artist));
		}
		return artists;
	}

	private Map<String, Event> seedEvents(Map<String, User> users, Map<String, Artist> artists) {
		Map<String, Event> events = new HashMap<>();
		for (DemoData.EventSpec spec : DemoData.EVENTS) {
			events.put(spec.key(), eventRepository.save(buildEvent(spec, users, artists)));
		}
		return events;
	}

	private Event buildEvent(DemoData.EventSpec spec, Map<String, User> users, Map<String, Artist> artists) {
		ZonedDateTime start = ZonedDateTime.of(LocalDate.now(ROME).plusDays(spec.daysFromNow()),
				LocalTime.of(spec.startHour(), 0), ROME);
		OffsetDateTime startsAt = start.toOffsetDateTime();
		Event event = new Event(users.get(spec.ownerEmail()), spec.title(), startsAt, spec.address(), spec.city(),
				spec.latitude(), spec.longitude());
		event.setDescription(spec.description());
		event.setEndsAt(startsAt.plusHours(spec.durationHours()));
		event.setVenueName(spec.venue());
		event.setProvince(spec.province());
		event.setMaxParticipants(spec.maxParticipants());

		int order = 1;
		for (DemoData.SlotSpec slot : spec.lineup()) {
			EventArtist entry = new EventArtist(artists.get(slot.artist()), order);
			entry.setPerformanceStart(startsAt.plusMinutes(slot.startOffsetMinutes()));
			entry.setPerformanceEnd(startsAt.plusMinutes((long) slot.startOffsetMinutes() + slot.durationMinutes()));
			event.addToLineup(entry);
			order++;
		}
		for (DemoData.MarkerSpec marker : spec.markers()) {
			event.addMarker(new EventMarker(marker.kind(), marker.label(), marker.latitude(), marker.longitude()));
		}
		// storageKey null: sono foto esterne, non vanno mai cancellate da Cloudinary.
		for (int i = 0; i < spec.images(); i++) {
			event.addImage(new EventImage(IMAGE_URL.formatted(spec.key(), i), null, i));
		}
		return event;
	}

	private void seedTickets(Map<String, User> users, Map<String, Event> events) {
		OffsetDateTime now = OffsetDateTime.now();
		int sequence = 1;
		for (List<String> row : DemoData.TICKETS) {
			User user = users.get(row.getFirst());
			for (String eventKey : row.subList(1, row.size())) {
				Event event = events.get(eventKey);
				Ticket ticket = new Ticket(event, user, "EVT-DEMO%04d".formatted(sequence));
				// Email gia' "inviata": il job di reinvio non deve scrivere a indirizzi inventati.
				ticket.setEmailSentAt(now);
				ticketRepository.save(ticket);
				notificationRepository.save(new Notification(event.getOwner(), event, NotificationType.NEW_PARTICIPANT,
						"Nuovo partecipante", user.getFirstName() + " " + user.getLastName()
								+ " si e' iscritto a \"" + event.getTitle() + "\"."));
				sequence++;
			}
		}
	}

	private void seedFriendships(Map<String, User> users, Map<String, Event> events) {
		User luca = users.get("luca.moretti@eventi.dev");
		User sara = users.get("sara.colombo@eventi.dev");
		User davide = users.get("davide.romano@eventi.dev");
		User elena = users.get("elena.fontana@eventi.dev");

		Friendship lucaSara = accepted(luca, sara, events.get("jazz-bologna"));
		chat(lucaSara, List.of(
				new Line(luca, "Ciao Sara! Ci vediamo in Piazza Maggiore?", true),
				new Line(sara, "Certo, arrivo verso le 20:30 con una coperta", true),
				new Line(luca, "Perfetto, tengo il posto vicino al palco", false)));

		Friendship saraDavide = accepted(sara, davide, events.get("elettronica-milano"));
		chat(saraDavide, List.of(
				new Line(davide, "Hai visto la scaletta ai Navigli? DJ Vesuvio chiude", true),
				new Line(sara, "Si', non vedo l'ora!", false)));

		// Richiesta ancora da accettare: Luca la trova tra le richieste ricevute.
		friendshipRepository.save(new Friendship(elena, luca, events.get("jazz-bologna")));
		notificationRepository.save(new Notification(luca, events.get("jazz-bologna"), NotificationType.FRIEND_REQUEST,
				"Nuova richiesta di amicizia", "Elena Fontana vuole aggiungerti agli amici."));
	}

	private Friendship accepted(User requester, User addressee, Event event) {
		Friendship friendship = new Friendship(requester, addressee, event);
		friendship.setStatus(FriendshipStatus.ACCEPTED);
		friendship.setRespondedAt(OffsetDateTime.now());
		notificationRepository.save(new Notification(requester, event, NotificationType.FRIEND_ACCEPTED,
				"Amicizia accettata", addressee.getFirstName() + " ha accettato la tua richiesta."));
		return friendshipRepository.save(friendship);
	}

	private record Line(User sender, String content, boolean read) {
	}

	private void chat(Friendship friendship, List<Line> lines) {
		for (Line line : lines) {
			ChatMessage message = new ChatMessage(friendship, line.sender(), line.content());
			if (line.read()) {
				message.setReadAt(OffsetDateTime.now());
			}
			chatMessageRepository.save(message);
		}
	}

	/** Come EventService.cancel, ma senza listener: le notifiche ai partecipanti si scrivono qui. */
	private void cancelEvent(Event event) {
		event.setStatus(EventStatus.CANCELLED);
		for (Ticket ticket : ticketRepository.findAll()) {
			if (ticket.getEvent().getId().equals(event.getId())) {
				notificationRepository.save(new Notification(ticket.getUser(), event, NotificationType.EVENT_CANCELLED,
						"Evento annullato", "L'evento \"" + event.getTitle() + "\" e' stato annullato."));
			}
		}
	}

	static String slug(String name) {
		return name.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
	}
}
