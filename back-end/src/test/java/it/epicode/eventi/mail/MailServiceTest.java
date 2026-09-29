package it.epicode.eventi.mail;

import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.thymeleaf.spring6.SpringTemplateEngine;
import org.thymeleaf.templatemode.TemplateMode;
import org.thymeleaf.templateresolver.ClassLoaderTemplateResolver;

import java.util.Map;
import java.util.Properties;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Template veri (src/main/resources/templates/mail), server SMTP finto. */
class MailServiceTest {

	private JavaMailSender sender;
	private MailService mailService;

	@BeforeEach
	void setUp() {
		ClassLoaderTemplateResolver resolver = new ClassLoaderTemplateResolver();
		resolver.setPrefix("templates/");
		resolver.setSuffix(".html");
		resolver.setTemplateMode(TemplateMode.HTML);
		SpringTemplateEngine engine = new SpringTemplateEngine();
		engine.setTemplateResolver(resolver);

		sender = mock(JavaMailSender.class);
		when(sender.createMimeMessage()).thenReturn(new MimeMessage(Session.getInstance(new Properties())));
		mailService = new MailService(sender, engine, "noreply@eventi.it", "http://localhost:5173");
	}

	@Test
	void render_userData_isHtmlEscaped() {
		// Arrange: un nome scritto apposta per iniettare HTML nell'email
		Map<String, Object> vars = Map.of("firstName", "<script>alert(1)</script>", "code", "123456", "minutes", 15);

		// Act
		String html = mailService.render("verification-code", "Conferma", vars);

		// Assert
		assertThat(html).contains("123456");
		assertThat(html).doesNotContain("<script>alert(1)</script>");
		assertThat(html).contains("&lt;script&gt;");
	}

	@Test
	void render_ticket_containsLinkToEvent() {
		UUID eventId = UUID.randomUUID();
		String html = mailService.render("ticket", "Il tuo ticket", Map.of(
				"firstName", "Anna", "participantName", "Anna Rossi", "eventTitle", "Concerto",
				"eventDate", "01/06/2027 alle 21:00", "eventPlace", "Parco, Milano",
				"ticketCode", "EVT-7K3M9QA2", "eventId", eventId));

		assertThat(html).contains("EVT-7K3M9QA2").contains("http://localhost:5173/events/" + eventId);
	}

	@Test
	void sendTemplate_smtpFails_returnsFalse() {
		doThrow(new MailSendException("SMTP non raggiungibile")).when(sender).send(any(MimeMessage.class));

		boolean sent = mailService.sendTemplate("anna@mail.it", "Conferma", "verification-code",
				Map.of("firstName", "Anna", "code", "123456", "minutes", 15));

		assertThat(sent).isFalse();
		verify(sender).send(any(MimeMessage.class));
	}
}
