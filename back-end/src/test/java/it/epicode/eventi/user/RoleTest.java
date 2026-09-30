package it.epicode.eventi.user;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class RoleTest {

	@Test
	void isAtLeast_followsHierarchy() {
		assertThat(Role.SUPERADMIN.isAtLeast(Role.MODERATOR)).isTrue();
		assertThat(Role.SUPERADMIN.isAtLeast(Role.USER)).isTrue();
		assertThat(Role.MODERATOR.isAtLeast(Role.MODERATOR)).isTrue();
		assertThat(Role.MODERATOR.isAtLeast(Role.SUPERADMIN)).isFalse();
		assertThat(Role.USER.isAtLeast(Role.MODERATOR)).isFalse();
	}
}
