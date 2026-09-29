package it.epicode.eventi.auth;

import it.epicode.eventi.auth.dto.LoginRequest;
import it.epicode.eventi.auth.dto.RegisterRequest;
import it.epicode.eventi.auth.dto.ResendCodeRequest;
import it.epicode.eventi.auth.dto.UserResponse;
import it.epicode.eventi.auth.dto.VerifyRequest;
import it.epicode.eventi.common.CurrentUsers;
import it.epicode.eventi.security.AuthUser;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContextHolderStrategy;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfAuthenticationStrategy;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;

/**
 * Flusso: register -> email con codice -> verify -> login -> (cookie SESSION) -> me.
 * Dopo login e logout il token CSRF cambia: il FE lo rilegge con GET /api/auth/csrf.
 * Il logout (POST /api/auth/logout) lo gestisce Spring Security, vedi SecurityConfig.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

	private final AuthService authService;
	private final CurrentUsers currentUsers;
	private final CsrfAuthenticationStrategy csrfStrategy;
	private final SecurityContextRepository contextRepository = new HttpSessionSecurityContextRepository();
	private final SecurityContextHolderStrategy contextHolder = SecurityContextHolder.getContextHolderStrategy();

	public AuthController(AuthService authService, CurrentUsers currentUsers, CsrfTokenRepository csrfTokenRepository) {
		this.authService = authService;
		this.currentUsers = currentUsers;
		this.csrfStrategy = new CsrfAuthenticationStrategy(csrfTokenRepository);
		// Token "plain" come nel resto dell'API (CsrfTokenRequestAttributeHandler in SecurityConfig).
		this.csrfStrategy.setRequestHandler(new CsrfTokenRequestAttributeHandler());
	}

	@PostMapping("/register")
	@ResponseStatus(HttpStatus.CREATED)
	public UserResponse register(@Valid @RequestBody RegisterRequest req) {
		return UserResponse.from(authService.register(req));
	}

	@PostMapping("/verify")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void verify(@Valid @RequestBody VerifyRequest req) {
		authService.verify(req);
	}

	@PostMapping("/resend-code")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void resendCode(@Valid @RequestBody ResendCodeRequest req) {
		authService.resendCode(req);
	}

	@PostMapping("/login")
	public UserResponse login(@Valid @RequestBody LoginRequest req,
			HttpServletRequest request, HttpServletResponse response) {
		// Con server.forward-headers-strategy=native e' l'IP del client, non quello del proxy di Render.
		AuthUser user = authService.authenticate(req.email(), req.password(), request.getRemoteAddr());
		Authentication authentication = UsernamePasswordAuthenticationToken.authenticated(
				user, null, user.getAuthorities());

		// Nuovo id di sessione: un id fissato prima del login da un attaccante non vale piu' (session fixation).
		request.getSession(true);
		request.changeSessionId();

		// Senza saveContext la sessione resterebbe anonima alla richiesta successiva.
		SecurityContext context = contextHolder.createEmptyContext();
		context.setAuthentication(authentication);
		contextHolder.setContext(context);
		contextRepository.saveContext(context, request, response);

		// Il token CSRF anonimo non vale piu' dopo il login.
		csrfStrategy.onAuthentication(authentication, request, response);
		return UserResponse.from(currentUsers.require(authentication));
	}

	/** Il FE lo chiama all'avvio: 200 = loggato, 401 = no. */
	@GetMapping("/me")
	public UserResponse me(Principal principal) {
		return UserResponse.from(currentUsers.require(principal));
	}
}
