package it.epicode.eventi.event;

import it.epicode.eventi.common.exception.ConflictException;
import it.epicode.eventi.common.exception.ForbiddenException;
import it.epicode.eventi.user.Role;
import it.epicode.eventi.user.User;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Moderazione: MODERATOR e SUPERADMIN agiscono su eventi e artisti degli altri, USER no. */
@ExtendWith(MockitoExtension.class)
class ModerationTest {

	@Mock EventRepository eventRepository;
	@Mock ArtistRepository artistRepository;
	@Mock ApplicationEventPublisher events;

	@Test
	void cancelEventOfAnotherUser_asModerator_cancels() {
		Event event = eventOwnedBy(user(Role.USER));

		eventService().cancel(UUID.randomUUID(), user(Role.MODERATOR));

		verify(event).setStatus(EventStatus.CANCELLED);
		verify(events).publishEvent(any(EventChanged.class));
	}

	@Test
	void cancelEventOfAnotherUser_asSuperadmin_cancels() {
		Event event = eventOwnedBy(user(Role.USER));

		eventService().cancel(UUID.randomUUID(), user(Role.SUPERADMIN));

		verify(event).setStatus(EventStatus.CANCELLED);
	}

	@Test
	void cancelEventOfAnotherUser_asUser_throwsForbidden() {
		Event event = eventOwnedBy(user(Role.USER));

		assertThatThrownBy(() -> eventService().cancel(UUID.randomUUID(), user(Role.USER)))
				.isInstanceOf(ForbiddenException.class);
		verify(event, never()).setStatus(any());
	}

	@Test
	void deleteArtistInLineup_throwsConflict() {
		UUID id = UUID.randomUUID();
		when(artistRepository.findById(id)).thenReturn(Optional.of(new Artist("Caparezza")));
		when(artistRepository.countLineupEntries(id)).thenReturn(2L);

		assertThatThrownBy(() -> new ArtistService(artistRepository).delete(id))
				.isInstanceOf(ConflictException.class);
		verify(artistRepository, never()).delete(any());
	}

	@Test
	void deleteArtistNotInLineup_deletes() {
		UUID id = UUID.randomUUID();
		Artist artist = new Artist("Caparezza");
		when(artistRepository.findById(id)).thenReturn(Optional.of(artist));
		when(artistRepository.countLineupEntries(id)).thenReturn(0L);

		new ArtistService(artistRepository).delete(id);

		verify(artistRepository).delete(artist);
	}

	private EventService eventService() {
		return new EventService(eventRepository, new ArtistService(artistRepository), events);
	}

	private Event eventOwnedBy(User owner) {
		Event event = mock(Event.class);
		when(event.getOwner()).thenReturn(owner);
		lenient().when(event.getStatus()).thenReturn(EventStatus.PUBLISHED);
		when(eventRepository.findById(any())).thenReturn(Optional.of(event));
		return event;
	}

	private static User user(Role role) {
		User u = mock(User.class);
		lenient().when(u.getId()).thenReturn(UUID.randomUUID());
		lenient().when(u.getRole()).thenReturn(role);
		return u;
	}
}
