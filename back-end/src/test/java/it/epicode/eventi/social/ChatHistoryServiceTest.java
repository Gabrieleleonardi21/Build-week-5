package it.epicode.eventi.social;

import it.epicode.eventi.common.exception.NotFoundException;
import it.epicode.eventi.social.dto.ChatSummaryResponse;
import it.epicode.eventi.user.User;
import it.epicode.eventi.user.UserStatus;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ChatHistoryServiceTest {

	@Mock FriendshipRepository friendshipRepository;
	@Mock ChatMessageRepository messageRepository;
	@InjectMocks ChatHistoryService chatHistoryService;

	private final User anna = user("anna@mail.it", "Anna");
	private final User bruno = user("bruno@mail.it", "Bruno");
	private final User carla = user("carla@mail.it", "Carla");

	// ---------- bandeja ----------

	@Test
	void inbox_showsOtherUserLastMessageAndUnread() {
		Friendship f = friendship(anna, bruno, FriendshipStatus.ACCEPTED);
		ChatMessage last = new ChatMessage(f, bruno, "Ci vediamo al concerto!");
		when(messageRepository.findLastMessagePerChat(eq(anna.getId()), any(), any()))
				.thenReturn(new PageImpl<>(List.of(last)));
		when(messageRepository.countByFriendshipIdAndSenderIdNotAndReadAtIsNull(f.getId(), anna.getId())).thenReturn(2L);

		ChatSummaryResponse chat = chatHistoryService.inbox(anna, 0, 20).getContent().getFirst();

		assertThat(chat.chatId()).isEqualTo(f.getId());
		assertThat(chat.user().firstName()).isEqualTo("Bruno");
		assertThat(chat.lastMessage().content()).isEqualTo("Ci vediamo al concerto!");
		assertThat(chat.unreadMessages()).isEqualTo(2);
		assertThat(chat.canWrite()).isTrue();
	}

	@Test
	void inbox_removedFriend_staysInInboxButReadOnly() {
		// Come su Instagram: Bruno ha tolto Anna, ma la chat resta con il suo nome.
		Friendship f = friendship(anna, bruno, FriendshipStatus.REMOVED);
		when(messageRepository.findLastMessagePerChat(eq(bruno.getId()), any(), any()))
				.thenReturn(new PageImpl<>(List.of(new ChatMessage(f, anna, "Ciao"))));

		ChatSummaryResponse chat = chatHistoryService.inbox(bruno, 0, 20).getContent().getFirst();

		assertThat(chat.user().firstName()).isEqualTo("Anna");
		assertThat(chat.canWrite()).isFalse();
	}

	@Test
	void inbox_friendDeletedAccount_readOnlyWithAnonymizedName() {
		// Amicizia ancora ACCEPTED, ma Bruno ha cancellato l'account (D15): la chat resta, chiusa.
		bruno.setFirstName("Utente");
		bruno.setLastName("eliminato");
		bruno.setStatus(UserStatus.DEACTIVATED);
		bruno.setAnonymizedAt(OffsetDateTime.now());
		Friendship f = friendship(anna, bruno, FriendshipStatus.ACCEPTED);
		when(messageRepository.findLastMessagePerChat(eq(anna.getId()), any(), any()))
				.thenReturn(new PageImpl<>(List.of(new ChatMessage(f, bruno, "Ciao"))));

		ChatSummaryResponse chat = chatHistoryService.inbox(anna, 0, 20).getContent().getFirst();

		assertThat(chat.user().firstName()).isEqualTo("Utente");
		assertThat(chat.canWrite()).isFalse();
	}

	// ---------- storico ----------

	@Test
	void messages_afterFriendRemoved_historyStillReadable() {
		Friendship f = stored(friendship(anna, bruno, FriendshipStatus.REMOVED));
		when(messageRepository.findByFriendshipIdOrderBySentAtDesc(eq(f.getId()), any()))
				.thenReturn(new PageImpl<>(List.of()));

		chatHistoryService.messages(f.getId(), anna, 0, 30);

		verify(messageRepository).findByFriendshipIdOrderBySentAtDesc(eq(f.getId()), any());
	}

	@Test
	void messages_byOutsider_throwsNotFound() {
		Friendship f = stored(friendship(anna, bruno, FriendshipStatus.ACCEPTED));

		assertThatThrownBy(() -> chatHistoryService.messages(f.getId(), carla, 0, 30))
				.isInstanceOf(NotFoundException.class);
		verify(messageRepository, never()).findByFriendshipIdOrderBySentAtDesc(any(), any());
	}

	@Test
	void messages_pendingRequest_noChatYet_throwsNotFound() {
		Friendship f = stored(friendship(anna, bruno, FriendshipStatus.PENDING));

		assertThatThrownBy(() -> chatHistoryService.messages(f.getId(), anna, 0, 30))
				.isInstanceOf(NotFoundException.class);
	}

	@Test
	void markRead_marksOnlyMessagesFromTheOther() {
		Friendship f = stored(friendship(anna, bruno, FriendshipStatus.ACCEPTED));

		chatHistoryService.markRead(f.getId(), bruno);

		verify(messageRepository).markRead(eq(f.getId()), eq(bruno.getId()), any(OffsetDateTime.class));
	}

	// ---------- helper ----------

	private Friendship stored(Friendship f) {
		when(friendshipRepository.findWithUsersById(f.getId())).thenReturn(Optional.of(f));
		return f;
	}

	private static Friendship friendship(User requester, User addressee, FriendshipStatus status) {
		Friendship f = new Friendship(requester, addressee, null);
		ReflectionTestUtils.setField(f, "id", UUID.randomUUID());
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
