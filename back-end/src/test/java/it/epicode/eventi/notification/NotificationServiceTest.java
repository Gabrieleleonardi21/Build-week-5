package it.epicode.eventi.notification;

import it.epicode.eventi.common.exception.ForbiddenException;
import it.epicode.eventi.event.Event;
import it.epicode.eventi.event.EventRepository;
import it.epicode.eventi.notification.dto.OwnerMessageRequest;
import it.epicode.eventi.ticket.TicketRepository;
import it.epicode.eventi.user.User;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

	@Mock NotificationRepository notificationRepository;
	@Mock TicketRepository ticketRepository;
	@Mock EventRepository eventRepository;
	@Mock ApplicationEventPublisher events;
	@InjectMocks NotificationService notificationService;

	@Test
	void notify_savesAndPublishesPushForRecipient() {
		User recipient = user("bruno@mail.it");

		notificationService.notify(recipient, null, NotificationType.FRIEND_REQUEST, "Richiesta", "Anna ti ha scritto");

		verify(notificationRepository).save(any(Notification.class));
		verify(events).publishEvent(argThat((Object e) -> e instanceof NotificationCreated created
				&& created.recipientUsername().equals("bruno@mail.it")
				&& created.payload().type() == NotificationType.FRIEND_REQUEST));
	}

	@Test
	void markRead_notificationOfAnotherUser_throwsForbidden() {
		User owner = user("anna@mail.it");
		User intruder = user("carla@mail.it");
		Notification n = new Notification(owner, null, NotificationType.OWNER_MESSAGE, "Info", "Testo");
		UUID id = UUID.randomUUID();
		when(notificationRepository.findById(id)).thenReturn(Optional.of(n));

		assertThatThrownBy(() -> notificationService.markRead(id, intruder)).isInstanceOf(ForbiddenException.class);
		assertThat(n.getReadAt()).isNull();
	}

	@Test
	void ownerMessage_notOwner_throwsForbiddenAndSendsNothing() {
		Event event = mock(Event.class);
		User owner = user("anna@mail.it");
		when(event.getOwner()).thenReturn(owner);
		UUID eventId = UUID.randomUUID();
		when(eventRepository.findById(eventId)).thenReturn(Optional.of(event));

		assertThatThrownBy(() -> notificationService.ownerMessage(eventId, user("bruno@mail.it"),
				new OwnerMessageRequest("Info", "Testo"))).isInstanceOf(ForbiddenException.class);
		verify(notificationRepository, never()).save(any());
	}

	/** L'id lo genera Hibernate e non ha setter: nei test l'utente e' un mock con id finto. */
	private User user(String email) {
		User u = mock(User.class);
		// lenient: non tutti i test leggono sia l'id sia l'email.
		lenient().when(u.getId()).thenReturn(UUID.randomUUID());
		lenient().when(u.getEmail()).thenReturn(email);
		return u;
	}
}
