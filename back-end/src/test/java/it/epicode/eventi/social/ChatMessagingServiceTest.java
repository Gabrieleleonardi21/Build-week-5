package it.epicode.eventi.social;

import it.epicode.eventi.common.exception.BadRequestException;
import it.epicode.eventi.common.exception.ForbiddenException;
import it.epicode.eventi.user.User;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import it.epicode.eventi.user.UserStatus;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ChatMessagingServiceTest {

	@Mock FriendshipRepository friendshipRepository;
	@Mock ChatMessageRepository messageRepository;
	@Mock SimpMessagingTemplate messaging;
	@Mock ApplicationEventPublisher events;
	@InjectMocks ChatMessagingService chatService;

	private final UUID friendshipId = UUID.randomUUID();

	@Test
	void send_blankMessage_throwsBadRequest() {
		assertThatThrownBy(() -> chatService.send(mock(User.class), friendshipId, "   "))
				.isInstanceOf(BadRequestException.class);
		verify(messageRepository, never()).saveAndFlush(any());
	}

	@Test
	void send_friendshipNotAccepted_throwsForbidden() {
		User anna = user();
		User bruno = user();
		// Nasce PENDING: finche' non viene accettata non si puo' chattare (D13).
		Friendship pending = new Friendship(anna, bruno, null);
		when(friendshipRepository.findWithUsersById(friendshipId)).thenReturn(Optional.of(pending));

		assertThatThrownBy(() -> chatService.send(anna, friendshipId, "Ciao"))
				.isInstanceOf(ForbiddenException.class);
		verify(messageRepository, never()).saveAndFlush(any());
	}

	@Test
	void send_friendshipRemoved_throwsForbidden() {
		User anna = user();
		Friendship removed = new Friendship(anna, user(), null);
		// Dopo aver tolto l'amico lo storico si legge ancora, ma non si scrive piu'.
		removed.setStatus(FriendshipStatus.REMOVED);
		when(friendshipRepository.findWithUsersById(friendshipId)).thenReturn(Optional.of(removed));

		assertThatThrownBy(() -> chatService.send(anna, friendshipId, "Ciao"))
				.isInstanceOf(ForbiddenException.class);
		verify(messageRepository, never()).saveAndFlush(any());
	}

	@Test
	void send_userNotInFriendship_throwsForbidden() {
		Friendship accepted = new Friendship(user(), user(), null);
		accepted.setStatus(FriendshipStatus.ACCEPTED);
		when(friendshipRepository.findWithUsersById(friendshipId)).thenReturn(Optional.of(accepted));

		assertThatThrownBy(() -> chatService.send(user(), friendshipId, "Ciao"))
				.isInstanceOf(ForbiddenException.class);
	}

	@Test
	void send_friendDeletedAccount_throwsForbidden() {
		User anna = activeUser("anna@mail.it");
		User bruno = activeUser("bruno@mail.it");
		// Bruno ha cancellato l'account: amicizia ancora ACCEPTED, ma nessuno leggerebbe i messaggi.
		bruno.setStatus(UserStatus.DEACTIVATED);
		bruno.setAnonymizedAt(OffsetDateTime.now());
		Friendship accepted = new Friendship(anna, bruno, null);
		accepted.setStatus(FriendshipStatus.ACCEPTED);
		when(friendshipRepository.findWithUsersById(friendshipId)).thenReturn(Optional.of(accepted));

		assertThatThrownBy(() -> chatService.send(anna, friendshipId, "Ciao"))
				.isInstanceOf(ForbiddenException.class);
		verify(messageRepository, never()).saveAndFlush(any());
	}

	@Test
	void send_activeFriends_savesAndPublishesToBoth() {
		User anna = activeUser("anna@mail.it");
		User bruno = activeUser("bruno@mail.it");
		Friendship accepted = new Friendship(anna, bruno, null);
		accepted.setStatus(FriendshipStatus.ACCEPTED);
		when(friendshipRepository.findWithUsersById(friendshipId)).thenReturn(Optional.of(accepted));

		chatService.send(anna, friendshipId, "  Ciao Bruno  ");

		verify(messageRepository).saveAndFlush(argThat(m -> m.getContent().equals("Ciao Bruno")));
		verify(events).publishEvent(argThat((Object e) -> e instanceof ChatMessageSent sent
				&& sent.recipientUsernames().equals(List.of("anna@mail.it", "bruno@mail.it"))));
	}

	// User vero: isChatOpen legge stato e anonimizzazione.
	private static User activeUser(String email) {
		User u = new User(email, "$2a$04$hash", "Nome", "Cognome", LocalDate.of(2000, 1, 1), OffsetDateTime.now());
		ReflectionTestUtils.setField(u, "id", UUID.randomUUID());
		u.setStatus(UserStatus.ACTIVE);
		return u;
	}

	private User user() {
		User u = mock(User.class);
		// lenient: il controllo "fa parte dell'amicizia" si ferma al primo id che combacia.
		lenient().when(u.getId()).thenReturn(UUID.randomUUID());
		return u;
	}
}
