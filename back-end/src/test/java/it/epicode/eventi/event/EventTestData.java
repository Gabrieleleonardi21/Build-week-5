package it.epicode.eventi.event;

import it.epicode.eventi.user.Role;
import it.epicode.eventi.user.User;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;

/**
 * Oggetti di prova per i test del modulo eventi. Gli id li genera Hibernate e non hanno
 * setter (EntityIdRulesTest): nei test si impostano per reflection.
 */
final class EventTestData {

	private EventTestData() {
	}

	static User user(Role role) {
		User u = mock(User.class);
		// lenient: non tutti i test leggono id, ruolo e nomi.
		lenient().when(u.getId()).thenReturn(UUID.randomUUID());
		lenient().when(u.getRole()).thenReturn(role);
		lenient().when(u.getFirstName()).thenReturn("Anna");
		return u;
	}

	static Event event(User owner) {
		Event event = new Event(owner, "Concerto", OffsetDateTime.now().plusDays(30), "Via Roma 1", "Milano",
				45.46, 9.19);
		return withId(event);
	}

	static Artist artist(String name) {
		return withId(new Artist(name));
	}

	static EventImage image(String storageKey, int sortOrder) {
		return withId(new EventImage("https://res.cloudinary.com/x/" + storageKey, storageKey, sortOrder));
	}

	static <T> T withId(T entity) {
		ReflectionTestUtils.setField(entity, "id", UUID.randomUUID());
		return entity;
	}
}
