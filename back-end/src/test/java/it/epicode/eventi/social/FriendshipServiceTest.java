package it.epicode.eventi.social;

import it.epicode.eventi.common.exception.BadRequestException;
import it.epicode.eventi.common.exception.ConflictException;
import it.epicode.eventi.common.exception.ForbiddenException;
import it.epicode.eventi.common.exception.NotFoundException;
import it.epicode.eventi.event.Event;
import it.epicode.eventi.event.EventRepository;
import it.epicode.eventi.notification.NotificationService;
import it.epicode.eventi.notification.NotificationType;
import it.epicode.eventi.ticket.TicketRepository;
import it.epicode.eventi.ticket.TicketStatus;
import it.epicode.eventi.user.User;
import it.epicode.eventi.user.UserRepository;
import it.epicode.eventi.user.UserStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FriendshipServiceTest {

	@Mock FriendshipRepository friendshipRepository;
	@Mock ChatMessageRepository messageRepository;
	@Mock UserRepository userRepository;
	@Mock EventRepository eventRepository;
	@Mock TicketRepository ticketRepository;
	@Mock NotificationService notificationService;
	@InjectMocks FriendshipService friendshipService;

	private final User anna = user("anna@mail.it", "Anna");
	private final User bruno = user("bruno@mail.it", "Bruno");
	private final User carla = user("carla@mail.it", "Carla");
	private final UUID eventId = UUID.randomUUID();
	private Event event;

	@BeforeEach
	void setUp() {
		User owner = user("owner@mail.it", "Olga");
		event = mock(Event.class);
		lenient().when(event.getId()).thenReturn(eventId);
		lenient().when(event.getOwner()).thenReturn(owner);
		lenient().when(eventRepository.findById(eventId)).thenReturn(Optional.of(event));
		lenient().when(userRepository.findById(bruno.getId())).thenReturn(Optional.of(bruno));
	}

	// ---------- request ----------

	@Test
	void request_bothParticipants_createsPendingAndNotifies() {
		participants(anna, bruno);
		when(friendshipRepository.findBetween(anna.getId(), bruno.getId())).thenReturn(Optional.empty());

		friendshipService.request(anna, bruno.getId(), eventId);

		verify(friendshipRepository).saveAndFlush(any(Friendship.class));
		verify(notificationService).notify(eq(bruno), eq(event), eq(NotificationType.FRIEND_REQUEST), anyString(),
				eq("Anna Rossi ti ha inviato una richiesta di amicizia"));
	}

	@Test
	void request_toYourself_throwsBadRequest() {
		assertThatThrownBy(() -> friendshipService.request(anna, anna.getId(), eventId))
				.isInstanceOf(BadRequestException.class);
	}

	@Test
	void request_addresseeNotParticipant_throwsForbidden() {
		when(ticketRepository.existsByEventIdAndUserIdAndStatus(eventId, anna.getId(), TicketStatus.VALID)).thenReturn(true);
		when(ticketRepository.existsByEventIdAndUserIdAndStatus(eventId, bruno.getId(), TicketStatus.VALID)).thenReturn(false);

		assertThatThrownBy(() -> friendshipService.request(anna, bruno.getId(), eventId))
				.isInstanceOf(ForbiddenException.class);
		verify(friendshipRepository, never()).saveAndFlush(any());
	}

	@Test
	void request_deactivatedAddressee_throwsNotFound() {
		bruno.setStatus(UserStatus.DEACTIVATED);

		assertThatThrownBy(() -> friendshipService.request(anna, bruno.getId(), eventId))
				.isInstanceOf(NotFoundException.class);
	}

	@Test
	void request_alreadyFriends_throwsConflict() {
		participants(anna, bruno);
		when(friendshipRepository.findBetween(anna.getId(), bruno.getId()))
				.thenReturn(Optional.of(friendship(anna, bruno, FriendshipStatus.ACCEPTED)));

		assertThatThrownBy(() -> friendshipService.request(anna, bruno.getId(), eventId))
				.isInstanceOf(ConflictException.class).hasMessage("Siete gia' amici");
	}

	@Test
	void request_reversePending_throwsConflictSuggestingAccept() {
		participants(anna, bruno);
		when(friendshipRepository.findBetween(anna.getId(), bruno.getId()))
				.thenReturn(Optional.of(friendship(bruno, anna, FriendshipStatus.PENDING)));

		assertThatThrownBy(() -> friendshipService.request(anna, bruno.getId(), eventId))
				.isInstanceOf(ConflictException.class).hasMessageContaining("accettala");
		verify(notificationService, never()).notify(any(), any(), any(), any(), any());
	}

	@Test
	void request_rejectedJustNow_canBeSentAgainImmediately() {
		participants(anna, bruno);
		// Nessuna attesa dopo un rifiuto: si riusa la stessa riga (D12).
		Friendship rejected = friendship(anna, bruno, FriendshipStatus.REJECTED);
		rejected.setRespondedAt(OffsetDateTime.now());
		when(friendshipRepository.findBetween(anna.getId(), bruno.getId())).thenReturn(Optional.of(rejected));

		friendshipService.request(anna, bruno.getId(), eventId);

		assertThat(rejected.getStatus()).isEqualTo(FriendshipStatus.PENDING);
		assertThat(rejected.getRespondedAt()).isNull();
		verify(friendshipRepository).saveAndFlush(rejected);
		verify(notificationService).notify(eq(bruno), any(), eq(NotificationType.FRIEND_REQUEST), anyString(), anyString());
	}

	@Test
	void request_afterRemovedFriendship_reopensSameRowKeepingHistory() {
		participants(anna, bruno);
		Friendship removed = friendship(bruno, anna, FriendshipStatus.REMOVED);
		when(friendshipRepository.findBetween(anna.getId(), bruno.getId())).thenReturn(Optional.of(removed));

		friendshipService.request(anna, bruno.getId(), eventId);

		// Stessa riga: se Bruno accetta, la chat riprende con i messaggi di prima.
		assertThat(removed.getStatus()).isEqualTo(FriendshipStatus.PENDING);
		assertThat(removed.getRequester()).isEqualTo(anna);
		verify(friendshipRepository).saveAndFlush(removed);
	}

	@Test
	void request_whoRejectedCanChangeMindImmediately() {
		participants(anna, bruno);
		// Ieri Bruno ha rifiutato Anna; oggi ci ripensa e chiede lui l'amicizia ad Anna.
		Friendship rejected = friendship(anna, bruno, FriendshipStatus.REJECTED);
		rejected.setRespondedAt(OffsetDateTime.now().minusDays(1));
		when(userRepository.findById(anna.getId())).thenReturn(Optional.of(anna));
		when(friendshipRepository.findBetween(bruno.getId(), anna.getId())).thenReturn(Optional.of(rejected));

		friendshipService.request(bruno, anna.getId(), eventId);

		assertThat(rejected.getStatus()).isEqualTo(FriendshipStatus.PENDING);
		assertThat(rejected.getRequester()).isEqualTo(bruno);
		assertThat(rejected.getAddressee()).isEqualTo(anna);
	}

	// ---------- accept / reject ----------

	@Test
	void accept_byAddressee_acceptsAndNotifiesRequester() {
		Friendship f = stored(friendship(anna, bruno, FriendshipStatus.PENDING));

		friendshipService.accept(f.getId(), bruno);

		assertThat(f.getStatus()).isEqualTo(FriendshipStatus.ACCEPTED);
		assertThat(f.getRespondedAt()).isNotNull();
		verify(notificationService).notify(eq(anna), any(), eq(NotificationType.FRIEND_ACCEPTED), anyString(), anyString());
	}

	@Test
	void accept_byRequester_throwsForbidden() {
		Friendship f = stored(friendship(anna, bruno, FriendshipStatus.PENDING));

		assertThatThrownBy(() -> friendshipService.accept(f.getId(), anna)).isInstanceOf(ForbiddenException.class);
		assertThat(f.getStatus()).isEqualTo(FriendshipStatus.PENDING);
	}

	@Test
	void accept_byOutsider_throwsNotFound() {
		Friendship f = stored(friendship(anna, bruno, FriendshipStatus.PENDING));

		assertThatThrownBy(() -> friendshipService.accept(f.getId(), carla)).isInstanceOf(NotFoundException.class);
	}

	@Test
	void reject_byAddressee_rejectsWithoutNotification() {
		Friendship f = stored(friendship(anna, bruno, FriendshipStatus.PENDING));

		friendshipService.reject(f.getId(), bruno);

		assertThat(f.getStatus()).isEqualTo(FriendshipStatus.REJECTED);
		verify(notificationService, never()).notify(any(), any(), any(), any(), any());
	}

	@Test
	void accept_alreadyAccepted_throwsConflict() {
		Friendship f = stored(friendship(anna, bruno, FriendshipStatus.ACCEPTED));

		assertThatThrownBy(() -> friendshipService.accept(f.getId(), bruno)).isInstanceOf(ConflictException.class);
	}

	// ---------- remove ----------

	@Test
	void remove_friendByEitherMember_keepsRowAsRemoved() {
		Friendship f = stored(friendship(anna, bruno, FriendshipStatus.ACCEPTED));

		friendshipService.remove(f.getId(), bruno);

		// La riga resta: con ON DELETE CASCADE cancellarla toglierebbe lo storico della chat.
		assertThat(f.getStatus()).isEqualTo(FriendshipStatus.REMOVED);
		verify(friendshipRepository, never()).delete(any());
	}

	@Test
	void remove_alreadyRemoved_throwsNotFound() {
		Friendship f = stored(friendship(anna, bruno, FriendshipStatus.REMOVED));

		assertThatThrownBy(() -> friendshipService.remove(f.getId(), anna)).isInstanceOf(NotFoundException.class);
	}

	@Test
	void remove_ownSentRequest_deletes() {
		Friendship f = stored(friendship(anna, bruno, FriendshipStatus.PENDING));

		friendshipService.remove(f.getId(), anna);

		verify(friendshipRepository).delete(f);
	}

	@Test
	void remove_receivedRequest_throwsBadRequest() {
		Friendship f = stored(friendship(anna, bruno, FriendshipStatus.PENDING));

		assertThatThrownBy(() -> friendshipService.remove(f.getId(), bruno)).isInstanceOf(BadRequestException.class);
		verify(friendshipRepository, never()).delete(any());
	}

	@Test
	void remove_byOutsider_throwsNotFound() {
		Friendship f = stored(friendship(anna, bruno, FriendshipStatus.ACCEPTED));

		assertThatThrownBy(() -> friendshipService.remove(f.getId(), carla)).isInstanceOf(NotFoundException.class);
		verify(friendshipRepository, never()).delete(any());
	}

	// ---------- helper ----------

	private void participants(User... users) {
		for (User u : users) {
			lenient().when(ticketRepository.existsByEventIdAndUserIdAndStatus(eventId, u.getId(), TicketStatus.VALID))
					.thenReturn(true);
		}
	}

	private Friendship stored(Friendship f) {
		ReflectionTestUtils.setField(f, "id", UUID.randomUUID());
		when(friendshipRepository.findWithUsersById(f.getId())).thenReturn(Optional.of(f));
		return f;
	}

	private Friendship friendship(User requester, User addressee, FriendshipStatus status) {
		Friendship f = new Friendship(requester, addressee, event);
		f.setStatus(status);
		return f;
	}

	private static User user(String email, String firstName) {
		User u = new User(email, "$2a$04$hash", firstName, "Rossi", LocalDate.of(2000, 1, 1), OffsetDateTime.now());
		// L'id lo genera Hibernate al salvataggio: qui non c'e' database.
		ReflectionTestUtils.setField(u, "id", UUID.randomUUID());
		u.setStatus(UserStatus.ACTIVE);
		return u;
	}
}
