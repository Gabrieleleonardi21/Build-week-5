package it.epicode.eventi.dev;

import it.epicode.eventi.event.ArtistRepository;
import it.epicode.eventi.event.EventRepository;
import it.epicode.eventi.notification.NotificationRepository;
import it.epicode.eventi.social.ChatMessageRepository;
import it.epicode.eventi.social.FriendshipRepository;
import it.epicode.eventi.ticket.TicketRepository;
import it.epicode.eventi.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.PlatformTransactionManager;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class DemoDataSeederTest {

	@Test
	void run_databaseWithUsers_touchesNothing() {
		UserRepository users = mock(UserRepository.class);
		EventRepository events = mock(EventRepository.class);
		PlatformTransactionManager tm = mock(PlatformTransactionManager.class);
		when(users.count()).thenReturn(3L);
		DemoDataSeeder seeder = new DemoDataSeeder(users, mock(ArtistRepository.class), events,
				mock(TicketRepository.class), mock(FriendshipRepository.class), mock(ChatMessageRepository.class),
				mock(NotificationRepository.class), mock(PasswordEncoder.class), tm, "Password123!");

		seeder.run(null);

		verify(users, never()).save(any());
		verifyNoInteractions(events, tm);
	}

	// ---------- coerenza dei dati demo (errori qui farebbero fallire l'avvio con SEED_DATA=true)

	private static final Map<String, DemoData.EventSpec> EVENTS = DemoData.EVENTS.stream()
			.collect(Collectors.toMap(DemoData.EventSpec::key, Function.identity()));

	@Test
	void everyEvent_hasExistingOwnerArtistsAndItalianCoordinates() {
		Set<String> emails = DemoData.USERS.stream().map(DemoData.UserSpec::email).collect(Collectors.toSet());
		Set<String> artists = DemoData.ARTISTS.stream().map(DemoData.ArtistSpec::name).collect(Collectors.toSet());
		for (DemoData.EventSpec event : DemoData.EVENTS) {
			assertThat(emails).as(event.key()).contains(event.ownerEmail());
			assertThat(event.images()).as(event.key()).isBetween(1, 10);
			assertThat(event.latitude()).as(event.key()).isBetween(36.0, 47.5);
			assertThat(event.longitude()).as(event.key()).isBetween(6.5, 18.6);
			Set<String> lineup = new HashSet<>();
			for (DemoData.SlotSpec slot : event.lineup()) {
				assertThat(artists).as(event.key()).contains(slot.artist());
				assertThat(lineup.add(slot.artist())).as("artista ripetuto in " + event.key()).isTrue();
			}
		}
		assertThat(EVENTS).containsKey(DemoData.CANCELLED_EVENT);
	}

	@Test
	void tickets_referToExistingEventsAndNeverToOwnEvent() {
		for (List<String> row : DemoData.TICKETS) {
			String email = row.getFirst();
			for (String key : row.subList(1, row.size())) {
				assertThat(EVENTS).as(key).containsKey(key);
				// TicketService lo vieta: l'organizzatore non si iscrive al proprio evento.
				assertThat(EVENTS.get(key).ownerEmail()).as(email + " su " + key).isNotEqualTo(email);
			}
		}
	}

	@Test
	void slug_isUrlSafe() {
		assertThat(DemoDataSeeder.slug("Luna Rossa Quartet")).isEqualTo("luna-rossa-quartet");
		assertThat(DemoDataSeeder.slug("I Fari!")).isEqualTo("i-fari");
	}
}
