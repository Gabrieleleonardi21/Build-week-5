package it.epicode.eventi.event;

import it.epicode.eventi.common.exception.BadRequestException;
import it.epicode.eventi.common.exception.ConflictException;
import it.epicode.eventi.common.exception.ForbiddenException;
import it.epicode.eventi.common.exception.NotFoundException;
import it.epicode.eventi.common.storage.StoredFilesRemoved;
import it.epicode.eventi.event.dto.EventPinResponse;
import it.epicode.eventi.event.dto.EventRequest;
import it.epicode.eventi.event.dto.EventResponse;
import it.epicode.eventi.event.dto.EventSummaryResponse;
import it.epicode.eventi.event.dto.LineupEntryRequest;
import it.epicode.eventi.event.dto.MarkerRequest;
import it.epicode.eventi.ticket.TicketStatus;
import it.epicode.eventi.user.Role;
import it.epicode.eventi.user.User;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Eventi (Parte 2 e 5): lettura pubblica, scrittura solo del proprietario o di un MODERATOR/SUPERADMIN.
 * Modifica e annullamento pubblicano EventChanged: il modulo notifiche avvisa i partecipanti (D11).
 * Le immagini (upload su Cloudinary) le gestisce EventImageService; qui si cancellano
 * solo i file rimasti senza riga (evento cancellato, artista tolto dalla scaletta).
 */
@Service
public class EventService {

	private static final int MAX_PAGE_SIZE = 50;
	private static final int MAX_MAP_PINS = 500;

	private final EventRepository eventRepository;
	private final ArtistService artistService;
	private final ApplicationEventPublisher events;

	public EventService(EventRepository eventRepository, ArtistService artistService,
			ApplicationEventPublisher events) {
		this.eventRepository = eventRepository;
		this.artistService = artistService;
		this.events = events;
	}

	/** Lista pubblica: eventi pubblicati e non ancora finiti, dal piu' vicino. */
	@Transactional(readOnly = true)
	public Page<EventSummaryResponse> search(String q, String city, int page, int size) {
		return eventRepository.search(EventStatus.PUBLISHED, OffsetDateTime.now(), trimToEmpty(q), trimToEmpty(city),
				pageRequest(page, size)).map(EventSummaryResponse::from);
	}

	/** Mappa pubblica: stessi filtri della lista, senza paginazione ma con un tetto. */
	@Transactional(readOnly = true)
	public List<EventPinResponse> map(String q, String city) {
		return eventRepository.search(EventStatus.PUBLISHED, OffsetDateTime.now(), trimToEmpty(q), trimToEmpty(city),
				PageRequest.of(0, MAX_MAP_PINS)).map(EventPinResponse::from).getContent();
	}

	// Anche gli eventi annullati: chi ha il ticket deve poter vedere che e' saltato.
	@Transactional(readOnly = true)
	public EventResponse get(UUID id) {
		Event event = find(id);
		return EventResponse.from(event, eventRepository.countTickets(id, TicketStatus.VALID));
	}

	/** Eventi creati dall'utente, anche passati e annullati. */
	@Transactional(readOnly = true)
	public Page<EventSummaryResponse> mine(User me, int page, int size) {
		return eventRepository.findByOwnerIdOrderByStartsAtDesc(me.getId(), pageRequest(page, size))
				.map(EventSummaryResponse::from);
	}

	@Transactional
	public EventResponse create(User me, EventRequest req) {
		if (!req.startsAt().isAfter(OffsetDateTime.now())) {
			throw new BadRequestException("La data di inizio deve essere nel futuro");
		}
		Event event = new Event(me, req.title().trim(), req.startsAt(), req.address().trim(), req.city().trim(),
				req.latitude(), req.longitude());
		apply(event, req);
		// Flush: createdAt e updatedAt li valorizza Hibernate all'INSERT e servono nella risposta.
		eventRepository.saveAndFlush(event);
		return EventResponse.from(event, 0);
	}

	@Transactional
	public EventResponse update(UUID id, User me, EventRequest req) {
		Event event = findEditable(id, me);
		if (event.getStatus() == EventStatus.CANCELLED) {
			throw new BadRequestException("Un evento annullato non si puo' modificare");
		}
		// isEqual e non equals: stesso istante anche se il FE lo manda con un altro fuso orario.
		if (!req.startsAt().isEqual(event.getStartsAt()) && !req.startsAt().isAfter(OffsetDateTime.now())) {
			throw new BadRequestException("La data di inizio deve essere nel futuro");
		}
		long participants = eventRepository.countTickets(id, TicketStatus.VALID);
		if (req.maxParticipants() != null && req.maxParticipants() < participants) {
			throw new BadRequestException("La capienza non puo' essere inferiore ai "
					+ participants + " partecipanti gia' iscritti");
		}
		apply(event, req);
		eventRepository.flush();
		// Listener sincrono: le notifiche ai partecipanti entrano in questa stessa transazione.
		events.publishEvent(new EventChanged(event.getId(), false));
		return EventResponse.from(event, participants);
	}

	/** L'evento resta visibile come CANCELLED e i partecipanti vengono avvisati. */
	@Transactional
	public void cancel(UUID id, User me) {
		Event event = findEditable(id, me);
		if (event.getStatus() == EventStatus.CANCELLED) {
			// Gia' annullato: nessuna seconda notifica.
			return;
		}
		event.setStatus(EventStatus.CANCELLED);
		events.publishEvent(new EventChanged(event.getId(), true));
	}

	/** Cancellazione fisica solo senza partecipanti; con ticket VALID l'evento si annulla (EventStatus). */
	@Transactional
	public void delete(UUID id, User me) {
		Event event = findEditable(id, me);
		if (eventRepository.countTickets(id, TicketStatus.VALID) > 0) {
			throw new ConflictException("L'evento ha gia' dei partecipanti: annullalo invece di cancellarlo");
		}
		// Le righe di immagini e scaletta le cancella il DB (ON DELETE CASCADE), i file su Cloudinary no.
		List<String> files = new ArrayList<>();
		for (EventImage image : event.getImages()) {
			addIfPresent(files, image.getStorageKey());
		}
		for (EventArtist row : event.getLineup()) {
			addIfPresent(files, row.getPosterStorageKey());
		}
		eventRepository.delete(event);
		removeFilesAfterCommit(files);
	}

	private Event find(UUID id) {
		return eventRepository.findById(id)
				.orElseThrow(() -> new NotFoundException("Evento non trovato"));
	}

	/** Salva subito le modifiche in sospeso: serve a chi deve restituire id appena generati. */
	void flush() {
		eventRepository.flush();
	}

	// Controllo di proprieta' (SECURITY.md §3): l'id nell'URL da solo non basta.
	// Package-private: lo riusa EventImageService per foto e locandine.
	Event findEditable(UUID id, User me) {
		Event event = find(id);
		if (!event.getOwner().getId().equals(me.getId()) && !me.getRole().isAtLeast(Role.MODERATOR)) {
			throw new ForbiddenException("Non sei il proprietario dell'evento");
		}
		return event;
	}

	private void apply(Event event, EventRequest req) {
		if (req.endsAt() != null && req.endsAt().isBefore(req.startsAt())) {
			throw new BadRequestException("La fine dell'evento non puo' precedere l'inizio");
		}
		event.setTitle(req.title().trim());
		event.setDescription(blankToNull(req.description()));
		event.setStartsAt(req.startsAt());
		event.setEndsAt(req.endsAt());
		event.setVenueName(blankToNull(req.venueName()));
		event.setAddress(req.address().trim());
		event.setCity(req.city().trim());
		String province = blankToNull(req.province());
		event.setProvince(province == null ? null : province.toUpperCase(Locale.ROOT));
		event.setLatitude(req.latitude());
		event.setLongitude(req.longitude());
		event.setMaxParticipants(req.maxParticipants());
		replaceLineup(event, req.lineup() == null ? List.of() : req.lineup());
		replaceMarkers(event, req.markers() == null ? List.of() : req.markers());
	}

	/**
	 * La scaletta arriva gia' in ordine di esibizione (il primo apre la serata).
	 * Le righe degli artisti che restano si aggiornano invece di essere ricreate:
	 * cancellare e reinserire la stessa chiave (event_id, artist_id) nello stesso
	 * flush violerebbe la chiave primaria. Lo scambio di posizioni lo permette
	 * il vincolo DEFERRABLE su performance_order.
	 */
	private void replaceLineup(Event event, List<LineupEntryRequest> entries) {
		// Prima si risolvono tutti gli artisti (find-or-create), poi si tocca la scaletta.
		List<Artist> artists = new ArrayList<>();
		Set<UUID> artistIds = new HashSet<>();
		for (LineupEntryRequest entry : entries) {
			if (entry.performanceStart() != null && entry.performanceEnd() != null
					&& entry.performanceEnd().isBefore(entry.performanceStart())) {
				throw new BadRequestException("Orari di esibizione non validi per " + entry.artistName().trim());
			}
			Artist artist = artistService.findOrCreate(entry.artistName());
			if (!artistIds.add(artist.getId())) {
				throw new BadRequestException("Artista ripetuto in scaletta: " + artist.getName());
			}
			artists.add(artist);
		}

		Map<UUID, EventArtist> current = new HashMap<>();
		for (EventArtist row : event.getLineup()) {
			current.put(row.getArtist().getId(), row);
		}
		// Chi esce dalla scaletta perde anche la locandina su Cloudinary.
		List<String> removedPosters = new ArrayList<>();
		for (EventArtist row : event.getLineup()) {
			if (!artistIds.contains(row.getArtist().getId())) {
				addIfPresent(removedPosters, row.getPosterStorageKey());
			}
		}
		event.getLineup().removeIf(row -> !artistIds.contains(row.getArtist().getId()));
		removeFilesAfterCommit(removedPosters);

		for (int i = 0; i < artists.size(); i++) {
			Artist artist = artists.get(i);
			LineupEntryRequest entry = entries.get(i);
			int order = i + 1;
			EventArtist row = current.get(artist.getId());
			if (row == null) {
				row = new EventArtist(artist, order);
				event.addToLineup(row);
			} else {
				row.setPerformanceOrder(order);
			}
			row.setPerformanceStart(entry.performanceStart());
			row.setPerformanceEnd(entry.performanceEnd());
		}
	}

	// I marker non sono referenziati da nient'altro: si ricreano tutti (orphanRemoval cancella i vecchi).
	private void replaceMarkers(Event event, List<MarkerRequest> markers) {
		event.getMarkers().clear();
		for (MarkerRequest m : markers) {
			event.addMarker(new EventMarker(m.kind(), blankToNull(m.label()), m.latitude(), m.longitude()));
		}
	}

	private static void addIfPresent(List<String> keys, String key) {
		if (key != null) {
			keys.add(key);
		}
	}

	// ImageStorageService cancella i file solo se la transazione va a buon fine.
	private void removeFilesAfterCommit(List<String> storageKeys) {
		if (!storageKeys.isEmpty()) {
			events.publishEvent(new StoredFilesRemoved(storageKeys));
		}
	}

	private static PageRequest pageRequest(int page, int size) {
		return PageRequest.of(Math.max(page, 0), Math.clamp(size, 1, MAX_PAGE_SIZE));
	}

	// Nella query la stringa vuota vuol dire "nessun filtro": niente parametri null.
	private static String trimToEmpty(String value) {
		return value == null ? "" : value.trim();
	}

	private static String blankToNull(String value) {
		return value == null || value.isBlank() ? null : value.trim();
	}
}
