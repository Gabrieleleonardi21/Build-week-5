package it.epicode.eventi.event;

import it.epicode.eventi.common.exception.BadRequestException;
import it.epicode.eventi.common.exception.NotFoundException;
import it.epicode.eventi.common.storage.ImageStorageService;
import it.epicode.eventi.common.storage.StoredFilesRemoved;
import it.epicode.eventi.event.dto.EventImageResponse;
import it.epicode.eventi.event.dto.LineupEntryResponse;
import it.epicode.eventi.user.User;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

/**
 * Foto dell'evento e locandine della scaletta (D06). Stessi permessi della modifica
 * dell'evento (proprietario o ADMIN, evento non annullato), controllati prima dell'upload.
 * I file vecchi si cancellano da Cloudinary solo dopo il commit (StoredFilesRemoved).
 */
@Service
public class EventImageService {

	// Tetto per evento: evita che un utente riempia lo storage condiviso.
	static final int MAX_IMAGES = 10;

	private final EventService eventService;
	private final ImageStorageService storage;
	private final ApplicationEventPublisher events;

	public EventImageService(EventService eventService, ImageStorageService storage,
			ApplicationEventPublisher events) {
		this.eventService = eventService;
		this.storage = storage;
		this.events = events;
	}

	/** Nuova foto in coda: la prima caricata (sortOrder 0) e' la copertina. */
	@Transactional
	public EventImageResponse add(UUID eventId, User me, MultipartFile file) {
		Event event = editable(eventId, me);
		if (event.getImages().size() >= MAX_IMAGES) {
			throw new BadRequestException("Massimo " + MAX_IMAGES + " immagini per evento");
		}
		ImageStorageService.StoredImage stored = storage.upload(file);
		EventImage image = new EventImage(stored.url(), stored.storageKey(), nextSortOrder(event));
		event.addImage(image);
		// Flush: l'id dell'immagine serve nella risposta (per poterla cancellare).
		eventService.flush();
		return EventImageResponse.from(image);
	}

	/** Se si toglie la copertina, diventa copertina la foto successiva (ordine per sortOrder). */
	@Transactional
	public void delete(UUID eventId, UUID imageId, User me) {
		Event event = editable(eventId, me);
		EventImage image = event.getImages().stream()
				.filter(i -> i.getId().equals(imageId))
				.findFirst()
				.orElseThrow(() -> new NotFoundException("Immagine non trovata"));
		event.getImages().remove(image);
		removeFileAfterCommit(image.getStorageKey());
	}

	/** Locandina di un artista per questa serata: sostituisce quella precedente, se c'era. */
	@Transactional
	public LineupEntryResponse setPoster(UUID eventId, UUID artistId, User me, MultipartFile file) {
		EventArtist entry = lineupEntry(editable(eventId, me), artistId);
		ImageStorageService.StoredImage stored = storage.upload(file);
		removeFileAfterCommit(entry.getPosterStorageKey());
		entry.setPosterUrl(stored.url());
		entry.setPosterStorageKey(stored.storageKey());
		return LineupEntryResponse.from(entry);
	}

	@Transactional
	public void deletePoster(UUID eventId, UUID artistId, User me) {
		EventArtist entry = lineupEntry(editable(eventId, me), artistId);
		if (entry.getPosterUrl() == null) {
			throw new NotFoundException("Nessuna locandina per questo artista");
		}
		removeFileAfterCommit(entry.getPosterStorageKey());
		entry.setPosterUrl(null);
		entry.setPosterStorageKey(null);
	}

	private Event editable(UUID eventId, User me) {
		Event event = eventService.findEditable(eventId, me);
		if (event.getStatus() == EventStatus.CANCELLED) {
			throw new BadRequestException("Un evento annullato non si puo' modificare");
		}
		return event;
	}

	private static EventArtist lineupEntry(Event event, UUID artistId) {
		return event.getLineup().stream()
				.filter(e -> e.getArtist().getId().equals(artistId))
				.findFirst()
				.orElseThrow(() -> new NotFoundException("Artista non presente in scaletta"));
	}

	// max + 1 e non size(): dopo una cancellazione size() ripeterebbe un sortOrder gia' usato.
	private static int nextSortOrder(Event event) {
		int next = 0;
		for (EventImage image : event.getImages()) {
			next = Math.max(next, image.getSortOrder() + 1);
		}
		return next;
	}

	private void removeFileAfterCommit(String storageKey) {
		if (storageKey != null) {
			events.publishEvent(new StoredFilesRemoved(List.of(storageKey)));
		}
	}
}
