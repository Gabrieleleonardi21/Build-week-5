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

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
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
	void send_userNotInFriendship_throwsForbidden() {
		Friendship accepted = new Friendship(user(), user(), null);
		accepted.setStatus(FriendshipStatus.ACCEPTED);
		when(friendshipRepository.findWithUsersById(friendshipId)).thenReturn(Optional.of(accepted));

		assertThatThrownBy(() -> chatService.send(user(), friendshipId, "Ciao"))
				.isInstanceOf(ForbiddenException.class);
	}

	private User user() {
		User u = mock(User.class);
		// lenient: il controllo "fa parte dell'amicizia" si ferma al primo id che combacia.
		lenient().when(u.getId()).thenReturn(UUID.randomUUID());
		return u;
	}
}
