package it.epicode.eventi.event;

import it.epicode.eventi.common.exception.BadRequestException;
import it.epicode.eventi.common.exception.ConflictException;
import it.epicode.eventi.common.exception.ForbiddenException;
import it.epicode.eventi.common.exception.NotFoundException;
import it.epicode.eventi.common.storage.StoredFilesRemoved;
import it.epicode.eventi.event.dto.EventRequest;
import it.epicode.eventi.event.dto.EventResponse;
import it.epicode.eventi.event.dto.LineupEntryRequest;
import it.epicode.eventi.ticket.TicketStatus;
import it.epicode.eventi.user.Role;
import it.epicode.eventi.user.User;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static it.epicode.eventi.event.EventTestData.artist;
import static it.epicode.eventi.event.EventTestData.event;
import static it.epicode.eventi.event.EventTestData.image;
import static it.epicode.eventi.event.EventTestData.user;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EventServiceTest {

	@Mock EventRepository eventRepository;
	@Mock ArtistService artistService;
	@Mock ApplicationEventPublisher events;
	@InjectMocks EventService eventService;

	@Test
	void create_startInThePast_throwsBadRequest() {
		EventRequest req = request(OffsetDateTime.now().minusDays(1), null);

		assertThatThrownBy(() -> eventService.create(user(Role.USER), req)).isInstanceOf(BadRequestException.class);
		verify(eventRepository, never()).saveAndFlush(any());
	}

	@Test
	void create_endBeforeStart_throwsBadRequest() {
		OffsetDateTime start = OffsetDateTime.now().plusDays(10);
		EventRequest req = request(start, start.minusHours(1), null, List.of());

		assertThatThrownBy(() -> eventService.create(user(Role.USER), req)).isInstanceOf(BadRequestException.class);
	}

	@Test
	void create_buildsLineupInRequestOrderAndUppercasesProvince() {
		User me = user(Role.USER);
		when(artistService.findOrCreate("Band A")).thenReturn(artist("Band A"));
		when(artistService.findOrCreate("Band B")).thenReturn(artist("Band B"));

		EventResponse res = eventService.create(me, request(OffsetDateTime.now().plusDays(10),
				List.of(new LineupEntryRequest("Band A", null, null), new LineupEntryRequest("Band B", null, null))));

		assertThat(res.lineup()).extracting(l -> l.artistName()).containsExactly("Band A", "Band B");
		assertThat(res.lineup()).extracting(l -> l.performanceOrder()).containsExactly(1, 2);
		assertThat(res.province()).isEqualTo("MI");
		verify(eventRepository).saveAndFlush(any(Event.class));
	}

	@Test
	void create_sameArtistTwice_throwsBadRequest() {
		Artist band = artist("Band A");
		when(artistService.findOrCreate("Band A")).thenReturn(band);
		when(artistService.findOrCreate("band a")).thenReturn(band);

		assertThatThrownBy(() -> eventService.create(user(Role.USER), request(OffsetDateTime.now().plusDays(10),
				List.of(new LineupEntryRequest("Band A", null, null), new LineupEntryRequest("band a", null, null)))))
				.isInstanceOf(BadRequestException.class)
				.hasMessageContaining("ripetuto");
	}

	@Test
	void get_missingEvent_throwsNotFound() {
		UUID id = UUID.randomUUID();
		when(eventRepository.findById(id)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> eventService.get(id)).isInstanceOf(NotFoundException.class);
	}

	@Test
	void update_notOwner_throwsForbiddenAndPublishesNothing() {
		Event event = stored(event(user(Role.USER)));

		assertThatThrownBy(() -> eventService.update(event.getId(), user(Role.USER),
				request(OffsetDateTime.now().plusDays(10), null))).isInstanceOf(ForbiddenException.class);
		verify(events, never()).publishEvent(any(Object.class));
	}

	@Test
	void update_admin_canEditAnyEventAndNotifiesHolders() {
		Event event = stored(event(user(Role.USER)));

		eventService.update(event.getId(), user(Role.ADMIN), request(OffsetDateTime.now().plusDays(10), null));

		verify(events).publishEvent(new EventChanged(event.getId(), false));
	}

	@Test
	void update_capacityBelowParticipants_throwsBadRequest() {
		User owner = user(Role.USER);
		Event event = stored(event(owner));
		when(eventRepository.countTickets(event.getId(), TicketStatus.VALID)).thenReturn(5L);
		EventRequest req = request(OffsetDateTime.now().plusDays(10), null, 3, null);

		assertThatThrownBy(() -> eventService.update(event.getId(), owner, req))
				.isInstanceOf(BadRequestException.class);
	}

	@Test
	void update_cancelledEvent_throwsBadRequest() {
		User owner = user(Role.USER);
		Event event = stored(event(owner));
		event.setStatus(EventStatus.CANCELLED);

		assertThatThrownBy(() -> eventService.update(event.getId(), owner,
				request(OffsetDateTime.now().plusDays(10), null))).isInstanceOf(BadRequestException.class);
	}

	@Test
	void update_swapLineup_keepsRowsAndPosters() {
		User owner = user(Role.USER);
		Event event = stored(event(owner));
		Artist a = artist("Band A");
		Artist b = artist("Band B");
		EventArtist rowA = new EventArtist(a, 1);
		rowA.setPosterUrl("https://res.cloudinary.com/x/poster-a");
		event.addToLineup(rowA);
		event.addToLineup(new EventArtist(b, 2));
		when(artistService.findOrCreate("Band B")).thenReturn(b);
		when(artistService.findOrCreate("Band A")).thenReturn(a);

		eventService.update(event.getId(), owner, request(OffsetDateTime.now().plusDays(10),
				List.of(new LineupEntryRequest("Band B", null, null), new LineupEntryRequest("Band A", null, null))));

		assertThat(event.getLineup()).hasSize(2).contains(rowA);
		assertThat(rowA.getPerformanceOrder()).isEqualTo(2);
		assertThat(rowA.getPosterUrl()).isNotNull();
	}

	@Test
	void update_artistRemovedFromLineup_deletesPosterAfterCommit() {
		User owner = user(Role.USER);
		Event event = stored(event(owner));
		EventArtist row = new EventArtist(artist("Band A"), 1);
		row.setPosterStorageKey("eventi/poster-a");
		event.addToLineup(row);

		eventService.update(event.getId(), owner, request(OffsetDateTime.now().plusDays(10), List.of()));

		assertThat(event.getLineup()).isEmpty();
		verify(events).publishEvent(new StoredFilesRemoved(List.of("eventi/poster-a")));
	}

	@Test
	void cancel_publishesCancelledOnlyOnce() {
		User owner = user(Role.USER);
		Event event = stored(event(owner));

		eventService.cancel(event.getId(), owner);
		eventService.cancel(event.getId(), owner);

		assertThat(event.getStatus()).isEqualTo(EventStatus.CANCELLED);
		verify(events).publishEvent(new EventChanged(event.getId(), true));
	}

	@Test
	void delete_withParticipants_throwsConflict() {
		User owner = user(Role.USER);
		Event event = stored(event(owner));
		when(eventRepository.countTickets(event.getId(), TicketStatus.VALID)).thenReturn(1L);

		assertThatThrownBy(() -> eventService.delete(event.getId(), owner)).isInstanceOf(ConflictException.class);
		verify(eventRepository, never()).delete(any());
	}

	@Test
	void delete_removesImagesAndPostersFromStorage() {
		User owner = user(Role.USER);
		Event event = stored(event(owner));
		event.addImage(image("eventi/cover", 0));
		EventArtist row = new EventArtist(artist("Band A"), 1);
		row.setPosterStorageKey("eventi/poster-a");
		event.addToLineup(row);

		eventService.delete(event.getId(), owner);

		verify(eventRepository).delete(event);
		verify(events).publishEvent(new StoredFilesRemoved(List.of("eventi/cover", "eventi/poster-a")));
	}

	private Event stored(Event event) {
		when(eventRepository.findById(event.getId())).thenReturn(Optional.of(event));
		return event;
	}

	private static EventRequest request(OffsetDateTime startsAt, List<LineupEntryRequest> lineup) {
		return request(startsAt, null, null, lineup);
	}

	private static EventRequest request(OffsetDateTime startsAt, OffsetDateTime endsAt, Integer maxParticipants,
			List<LineupEntryRequest> lineup) {
		return new EventRequest("Concerto", null, startsAt, endsAt, null, "Via Roma 1", "Milano", "mi",
				45.46, 9.19, maxParticipants, lineup, null);
	}
}
