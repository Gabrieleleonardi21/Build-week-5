package it.epicode.eventi.common.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

/**
 * @EnableAsync: le email partono in un thread separato, la risposta HTTP non le aspetta.
 * @EnableScheduling: job periodici (es. reinvio delle email dei ticket fallite).
 */
@Configuration
@EnableAsync
@EnableScheduling
public class AsyncConfig {

	/**
	 * Il nome "taskExecutor" e' quello che @Async cerca. Va dichiarato a mano:
	 * i WebSocket creano altri executor e Spring Boot smette di crearne uno di default.
	 */
	@Bean(name = "taskExecutor")
	public ThreadPoolTaskExecutor taskExecutor() {
		ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
		executor.setCorePoolSize(2);
		executor.setMaxPoolSize(4);
		executor.setQueueCapacity(100);
		executor.setThreadNamePrefix("mail-");
		return executor;
	}
}
