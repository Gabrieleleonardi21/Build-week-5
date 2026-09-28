package it.epicode.eventi.user;

/**
 * Ciclo di vita dell'account: PENDING_VERIFICATION -> ACTIVE -> DEACTIVATED.
 * Solo ACTIVE puo' fare login e usare la piattaforma.
 */
public enum UserStatus {
	PENDING_VERIFICATION,
	ACTIVE,
	DEACTIVATED
}
