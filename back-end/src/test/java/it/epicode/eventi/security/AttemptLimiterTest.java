package it.epicode.eventi.security;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

class AttemptLimiterTest {

	/** Orologio fermo che il test fa avanzare a mano. */
	static class MutableClock extends Clock {
		Instant now = Instant.parse("2026-09-29T10:00:00Z");
		@Override public ZoneOffset getZone() { return ZoneOffset.UTC; }
		@Override public Clock withZone(java.time.ZoneId zone) { return this; }
		@Override public Instant instant() { return now; }
	}

	final MutableClock clock = new MutableClock();
	final AttemptLimiter limiter = new AttemptLimiter(clock);

	@Test
	void blocksAfterMaxAttempts() {
		for (int i = 0; i < 4; i++) {
			limiter.record("login:email:anna@mail.it");
		}
		assertThat(limiter.isBlocked("login:email:anna@mail.it", 5)).isFalse();

		limiter.record("login:email:anna@mail.it");
		assertThat(limiter.isBlocked("login:email:anna@mail.it", 5)).isTrue();
		assertThat(limiter.isBlocked("login:email:bruno@mail.it", 5)).isFalse();
	}

	@Test
	void unblocksWhenWindowExpires() {
		for (int i = 0; i < 5; i++) {
			limiter.record("k");
		}
		clock.now = clock.now.plus(AttemptLimiter.WINDOW);

		assertThat(limiter.isBlocked("k", 5)).isFalse();
		limiter.record("k");
		assertThat(limiter.isBlocked("k", 2)).isFalse();
	}

	@Test
	void resetClearsCounter() {
		limiter.record("k");
		limiter.record("k");
		limiter.reset("k");

		assertThat(limiter.isBlocked("k", 1)).isFalse();
	}
}
