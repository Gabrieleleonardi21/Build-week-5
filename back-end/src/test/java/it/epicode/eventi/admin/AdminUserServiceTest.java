package it.epicode.eventi.admin;

import it.epicode.eventi.common.exception.BadRequestException;
import it.epicode.eventi.common.exception.ForbiddenException;
import it.epicode.eventi.security.UserSessions;
import it.epicode.eventi.user.Role;
import it.epicode.eventi.user.User;
import it.epicode.eventi.user.UserRepository;
import it.epicode.eventi.user.UserStatus;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.util.Optional;

import static it.epicode.eventi.admin.TestUsers.user;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminUserServiceTest {

	@Mock UserRepository userRepository;
	@Mock UserSessions userSessions;
	@InjectMocks AdminUserService adminUserService;

	private final User superadmin = user("super@mail.it", Role.SUPERADMIN, UserStatus.ACTIVE);
	private final User moderator = user("mod@mail.it", Role.MODERATOR, UserStatus.ACTIVE);
	private final User anna = user("anna@mail.it", Role.USER, UserStatus.ACTIVE);

	// ---------- changeRole ----------

	@Test
	void changeRole_superadminPromotesUser_changesRoleAndClosesSessions() {
		when(userRepository.findById(anna.getId())).thenReturn(Optional.of(anna));

		adminUserService.changeRole(anna.getId(), Role.MODERATOR, superadmin);

		assertThat(anna.getRole()).isEqualTo(Role.MODERATOR);
		verify(userSessions).invalidateAll("anna@mail.it");
	}

	@Test
	void changeRole_superadminDemotesModerator() {
		when(userRepository.findById(moderator.getId())).thenReturn(Optional.of(moderator));

		adminUserService.changeRole(moderator.getId(), Role.USER, superadmin);

		assertThat(moderator.getRole()).isEqualTo(Role.USER);
		verify(userSessions).invalidateAll("mod@mail.it");
	}

	@Test
	void changeRole_byModerator_throwsForbidden() {
		assertThatThrownBy(() -> adminUserService.changeRole(anna.getId(), Role.MODERATOR, moderator))
				.isInstanceOf(ForbiddenException.class);
		assertThat(anna.getRole()).isEqualTo(Role.USER);
	}

	@Test
	void changeRole_ownRole_throwsBadRequest() {
		when(userRepository.findById(superadmin.getId())).thenReturn(Optional.of(superadmin));

		assertThatThrownBy(() -> adminUserService.changeRole(superadmin.getId(), Role.USER, superadmin))
				.isInstanceOf(BadRequestException.class);
		assertThat(superadmin.getRole()).isEqualTo(Role.SUPERADMIN);
	}

	@Test
	void changeRole_sameRole_doesNotCloseSessions() {
		when(userRepository.findById(anna.getId())).thenReturn(Optional.of(anna));

		adminUserService.changeRole(anna.getId(), Role.USER, superadmin);

		verify(userSessions, never()).invalidateAll(anyString());
	}

	@Test
	void changeRole_anonymizedUser_throwsBadRequest() {
		anna.setAnonymizedAt(OffsetDateTime.now());
		when(userRepository.findById(anna.getId())).thenReturn(Optional.of(anna));

		assertThatThrownBy(() -> adminUserService.changeRole(anna.getId(), Role.MODERATOR, superadmin))
				.isInstanceOf(BadRequestException.class);
	}

	// ---------- changeStatus ----------

	@Test
	void changeStatus_moderatorDeactivatesUser_closesSessions() {
		when(userRepository.findById(anna.getId())).thenReturn(Optional.of(anna));

		adminUserService.changeStatus(anna.getId(), UserStatus.DEACTIVATED, moderator);

		assertThat(anna.getStatus()).isEqualTo(UserStatus.DEACTIVATED);
		verify(userSessions).invalidateAll("anna@mail.it");
	}

	@Test
	void changeStatus_moderatorOnAnotherModerator_throwsForbidden() {
		User otherModerator = user("mod2@mail.it", Role.MODERATOR, UserStatus.ACTIVE);
		when(userRepository.findById(otherModerator.getId())).thenReturn(Optional.of(otherModerator));

		assertThatThrownBy(() -> adminUserService.changeStatus(otherModerator.getId(), UserStatus.DEACTIVATED, moderator))
				.isInstanceOf(ForbiddenException.class);
		assertThat(otherModerator.getStatus()).isEqualTo(UserStatus.ACTIVE);
	}

	@Test
	void changeStatus_moderatorOnSuperadmin_throwsForbidden() {
		when(userRepository.findById(superadmin.getId())).thenReturn(Optional.of(superadmin));

		assertThatThrownBy(() -> adminUserService.changeStatus(superadmin.getId(), UserStatus.DEACTIVATED, moderator))
				.isInstanceOf(ForbiddenException.class);
	}

	@Test
	void changeStatus_superadminDeactivatesModerator() {
		when(userRepository.findById(moderator.getId())).thenReturn(Optional.of(moderator));

		adminUserService.changeStatus(moderator.getId(), UserStatus.DEACTIVATED, superadmin);

		assertThat(moderator.getStatus()).isEqualTo(UserStatus.DEACTIVATED);
	}

	@Test
	void changeStatus_byUser_throwsForbidden() {
		User bruno = user("bruno@mail.it", Role.USER, UserStatus.ACTIVE);

		assertThatThrownBy(() -> adminUserService.changeStatus(anna.getId(), UserStatus.DEACTIVATED, bruno))
				.isInstanceOf(ForbiddenException.class);
	}

	@Test
	void changeStatus_ownAccount_throwsBadRequest() {
		when(userRepository.findById(moderator.getId())).thenReturn(Optional.of(moderator));

		assertThatThrownBy(() -> adminUserService.changeStatus(moderator.getId(), UserStatus.DEACTIVATED, moderator))
				.isInstanceOf(BadRequestException.class);
	}

	@Test
	void changeStatus_reactivateVerifiedUser_becomesActive() {
		anna.setStatus(UserStatus.DEACTIVATED);
		when(userRepository.findById(anna.getId())).thenReturn(Optional.of(anna));

		adminUserService.changeStatus(anna.getId(), UserStatus.ACTIVE, moderator);

		assertThat(anna.getStatus()).isEqualTo(UserStatus.ACTIVE);
	}

	@Test
	void changeStatus_reactivateNeverVerifiedUser_mustStillVerifyEmail() {
		User pending = user("nuovo@mail.it", Role.USER, UserStatus.DEACTIVATED);
		when(userRepository.findById(pending.getId())).thenReturn(Optional.of(pending));

		adminUserService.changeStatus(pending.getId(), UserStatus.ACTIVE, moderator);

		assertThat(pending.getStatus()).isEqualTo(UserStatus.PENDING_VERIFICATION);
	}

	@Test
	void changeStatus_toPendingVerification_throwsBadRequest() {
		when(userRepository.findById(anna.getId())).thenReturn(Optional.of(anna));

		assertThatThrownBy(() -> adminUserService.changeStatus(anna.getId(), UserStatus.PENDING_VERIFICATION, moderator))
				.isInstanceOf(BadRequestException.class);
	}
}
