package it.epicode.eventi.social;

/**
 * Stato dell'amicizia (D12). REJECTED e REMOVED restano salvati e possono tornare PENDING
 * con una nuova richiesta, riusando la stessa riga.
 * REMOVED = erano amici e uno dei due l'ha tolto: la riga non si cancella, cosi' lo
 * storico della chat resta (ON DELETE CASCADE lo cancellerebbe) e resta leggibile.
 */
public enum FriendshipStatus {
	PENDING,
	ACCEPTED,
	REJECTED,
	REMOVED
}
