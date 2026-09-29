package it.epicode.eventi.user;

/**
 * Ruolo applicativo, salvato come testo in users.role (D16).
 * L'ordine conta: ogni ruolo ha anche i permessi di quelli che lo precedono
 * (isAtLeast qui, RoleHierarchy in SecurityConfig per hasRole/@PreAuthorize).
 * <ul>
 *   <li>USER: utente normale.</li>
 *   <li>MODERATOR: modera eventi e artisti di chiunque, disattiva/riattiva gli account USER.</li>
 *   <li>SUPERADMIN: tutto, compreso cambiare il ruolo degli altri utenti.</li>
 * </ul>
 */
public enum Role {
	USER,
	MODERATOR,
	SUPERADMIN;

	public boolean isAtLeast(Role other) {
		return compareTo(other) >= 0;
	}
}
