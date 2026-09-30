package it.epicode.eventi.event;

import it.epicode.eventi.common.exception.BadRequestException;
import it.epicode.eventi.common.exception.ForbiddenException;
import it.epicode.eventi.common.exception.NotFoundException;
import it.epicode.eventi.common.storage.ImageStorageService;
import it.epicode.eventi.common.storage.StoredFilesRemoved;
import it.epicode.eventi.event.dto.EventImageResponse;
import it.epicode.eventi.event.dto.LineupEntryResponse;
import it.epicode.eventi.user.Role;
import it.epicode.eventi.user.User;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

import static it.epicode.eventi.event.EventTestData.artist;
import static it.epicode.eventi.event.EventTestData.event;
import static it.epicode.eventi.event.EventTestData.image;
import static it.epicode.eventi.event.EventTestData.user;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EventImageServiceTest {

	static final MultipartFile FILE = new MockMultipartFile("file", "foto.jpg", "image/jpeg", new byte[] {1});

	@Mock EventService eventService;
	@Mock ImageStorageService storage;
	@Mock ApplicationEventPublisher events;
	// Mock: TransactionTemplate chiama getTransaction/commit, qui senza un DB vero.
	@Mock PlatformTransactionManager transactionManager;
	@InjectMocks EventImageService imageService;

	@Test
	void add_appendsAfterHighestSortOrder() {
		User owner = user(Role.USER);
		Event event = editable(owner);
		event.addImage(image("eventi/b", 1));
		when(storage.upload(FILE)).thenReturn(new ImageStorageService.StoredImage("https://img/new", "eventi/new"));

		EventImageResponse res = imageService.add(event.getId(), owner, FILE);

		// Era stata cancellata la copertina (0): la nuova va dopo la 1, non sopra di lei.
		assertThat(res.sortOrder()).isEqualTo(2);
		assertThat(res.url()).isEqualTo("https://img/new");
		assertThat(event.getImages()).hasSize(2);
	}

	@Test
	void add_saveFailsAfterUpload_deletesUploadedFile() {
		User owner = user(Role.USER);
		Event event = editable(owner);
		when(storage.upload(FILE)).thenReturn(new ImageStorageService.StoredImage("https://img/new", "eventi/new"));
		doThrow(new IllegalStateException("DB giu'")).when(eventService).flush();

		assertThatThrownBy(() -> imageService.add(event.getId(), owner, FILE))
				.isInstanceOf(IllegalStateException.class);
		verify(storage).deleteQuietly("eventi/new");
	}

	@Test
	void add_uploadFails_savesNothing() {
		User owner = user(Role.USER);
		Event event = editable(owner);
		when(storage.upload(FILE)).thenThrow(new IllegalStateException("CLOUDINARY_URL non configurata"));

		assertThatThrownBy(() -> imageService.add(event.getId(), owner, FILE))
				.isInstanceOf(IllegalStateException.class);
		assertThat(event.getImages()).isEmpty();
		verify(eventService, never()).flush();
		verify(storage, never()).deleteQuietly(any());
	}

	@Test
	void add_notOwner_throwsForbiddenBeforeUpload() {
		UUID eventId = UUID.randomUUID();
		User intruder = user(Role.USER);
		when(eventService.findEditable(eventId, intruder)).thenThrow(new ForbiddenException("no"));

		assertThatThrownBy(() -> imageService.add(eventId, intruder, FILE)).isInstanceOf(ForbiddenException.class);
		verify(storage, never()).upload(any());
	}

	@Test
	void add_cancelledEvent_throwsBadRequestBeforeUpload() {
		User owner = user(Role.USER);
		Event event = editable(owner);
		event.setStatus(EventStatus.CANCELLED);

		assertThatThrownBy(() -> imageService.add(event.getId(), owner, FILE)).isInstanceOf(BadRequestException.class);
		verify(storage, never()).upload(any());
	}

	@Test
	void add_tooManyImages_throwsBadRequestBeforeUpload() {
		User owner = user(Role.USER);
		Event event = editable(owner);
		for (int i = 0; i < EventImageService.MAX_IMAGES; i++) {
			event.addImage(image("eventi/" + i, i));
		}

		assertThatThrownBy(() -> imageService.add(event.getId(), owner, FILE)).isInstanceOf(BadRequestException.class);
		verify(storage, never()).upload(any());
	}

	@Test
	void delete_removesRowAndFileAfterCommit() {
		User owner = user(Role.USER);
		Event event = editable(owner);
		EventImage cover = image("eventi/cover", 0);
		event.addImage(cover);

		imageService.delete(event.getId(), cover.getId(), owner);

		assertThat(event.getImages()).isEmpty();
		verify(events).publishEvent(new StoredFilesRemoved(List.of("eventi/cover")));
	}

	@Test
	void delete_unknownImage_throwsNotFound() {
		User owner = user(Role.USER);
		Event event = editable(owner);

		assertThatThrownBy(() -> imageService.delete(event.getId(), UUID.randomUUID(), owner))
				.isInstanceOf(NotFoundException.class);
	}

	@Test
	void setPoster_replacesOldPosterAndDeletesItsFile() {
		User owner = user(Role.USER);
		Event event = editable(owner);
		Artist band = artist("Band A");
		EventArtist row = new EventArtist(band, 1);
		row.setPosterUrl("https://img/old");
		row.setPosterStorageKey("eventi/old");
		event.addToLineup(row);
		when(storage.upload(FILE)).thenReturn(new ImageStorageService.StoredImage("https://img/new", "eventi/new"));

		LineupEntryResponse res = imageService.setPoster(event.getId(), band.getId(), owner, FILE);

		assertThat(res.posterUrl()).isEqualTo("https://img/new");
		assertThat(row.getPosterStorageKey()).isEqualTo("eventi/new");
		verify(events).publishEvent(new StoredFilesRemoved(List.of("eventi/old")));
	}

	@Test
	void setPoster_eventChangedDuringUpload_deletesNewFileAndKeepsOldPoster() {
		User owner = user(Role.USER);
		Event event = event(owner);
		Artist band = artist("Band A");
		EventArtist row = new EventArtist(band, 1);
		row.setPosterStorageKey("eventi/old");
		event.addToLineup(row);
		// Primo controllo ok; mentre il file sale su Cloudinary l'evento viene annullato.
		when(eventService.findEditable(event.getId(), owner)).thenReturn(event).thenAnswer(inv -> {
			event.setStatus(EventStatus.CANCELLED);
			return event;
		});
		when(storage.upload(FILE)).thenReturn(new ImageStorageService.StoredImage("https://img/new", "eventi/new"));

		assertThatThrownBy(() -> imageService.setPoster(event.getId(), band.getId(), owner, FILE))
				.isInstanceOf(BadRequestException.class);
		verify(storage).deleteQuietly("eventi/new");
		assertThat(row.getPosterStorageKey()).isEqualTo("eventi/old");
		verify(events, never()).publishEvent(any(Object.class));
	}

	@Test
	void setPoster_artistNotInLineup_throwsNotFoundBeforeUpload() {
		User owner = user(Role.USER);
		Event event = editable(owner);

		assertThatThrownBy(() -> imageService.setPoster(event.getId(), UUID.randomUUID(), owner, FILE))
				.isInstanceOf(NotFoundException.class);
		verify(storage, never()).upload(any());
	}

	@Test
	void deletePoster_withoutPoster_throwsNotFound() {
		User owner = user(Role.USER);
		Event event = editable(owner);
		Artist band = artist("Band A");
		event.addToLineup(new EventArtist(band, 1));

		assertThatThrownBy(() -> imageService.deletePoster(event.getId(), band.getId(), owner))
				.isInstanceOf(NotFoundException.class);
	}

	@Test
	void deletePoster_clearsColumnsAndDeletesFile() {
		User owner = user(Role.USER);
		Event event = editable(owner);
		Artist band = artist("Band A");
		EventArtist row = new EventArtist(band, 1);
		row.setPosterUrl("https://img/p");
		row.setPosterStorageKey("eventi/p");
		event.addToLineup(row);

		imageService.deletePoster(event.getId(), band.getId(), owner);

		assertThat(row.getPosterUrl()).isNull();
		assertThat(row.getPosterStorageKey()).isNull();
		verify(events).publishEvent(new StoredFilesRemoved(List.of("eventi/p")));
	}

	private Event editable(User owner) {
		Event event = event(owner);
		when(eventService.findEditable(event.getId(), owner)).thenReturn(event);
		return event;
	}
}
