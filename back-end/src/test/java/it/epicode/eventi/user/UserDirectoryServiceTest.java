package it.epicode.eventi.user;

import it.epicode.eventi.common.exception.BadRequestException;
import it.epicode.eventi.common.exception.NotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

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
class UserDirectoryServiceTest {

	@Mock UserRepository userRepository;
	@InjectMocks UserDirectoryService userDirectoryService;

	@Test
	void search_onlyActiveUsers() {
		when(userRepository.searchDirectory(eq(UserStatus.ACTIVE), eq("anna"), any(Pageable.class)))
				.thenReturn(new PageImpl<>(List.of(user(UserStatus.ACTIVE))));

		assertThat(userDirectoryService.search("  anna ", 0, 20).getContent()).hasSize(1);
	}

	@Test
	void search_queryTooShort_throwsBadRequest() {
		assertThatThrownBy(() -> userDirectoryService.search("a", 0, 20)).isInstanceOf(BadRequestException.class);
		assertThatThrownBy(() -> userDirectoryService.search(null, 0, 20)).isInstanceOf(BadRequestException.class);
		verify(userRepository, never()).searchDirectory(any(), any(), any());
	}

	@Test
	void get_activeUser_returnsProfile() {
		User anna = user(UserStatus.ACTIVE);
		UUID id = UUID.randomUUID();
		when(userRepository.findById(id)).thenReturn(Optional.of(anna));

		assertThat(userDirectoryService.get(id).firstName()).isEqualTo("Anna");
	}

	@Test
	void get_deactivatedUser_returns404() {
		UUID id = UUID.randomUUID();
		when(userRepository.findById(id)).thenReturn(Optional.of(user(UserStatus.DEACTIVATED)));

		assertThatThrownBy(() -> userDirectoryService.get(id)).isInstanceOf(NotFoundException.class);
	}

	@Test
	void get_anonymizedUser_returns404() {
		User anna = user(UserStatus.ACTIVE);
		anna.setAnonymizedAt(OffsetDateTime.now());
		UUID id = UUID.randomUUID();
		when(userRepository.findById(id)).thenReturn(Optional.of(anna));

		assertThatThrownBy(() -> userDirectoryService.get(id)).isInstanceOf(NotFoundException.class);
	}

	private static User user(UserStatus status) {
		User u = new User("anna@mail.it", "$2a$04$hash", "Anna", "Rossi", LocalDate.of(2000, 1, 1), OffsetDateTime.now());
		u.setStatus(status);
		return u;
	}
}
