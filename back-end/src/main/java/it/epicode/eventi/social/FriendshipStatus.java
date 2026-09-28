package it.epicode.eventi.social;

/** Stato della richiesta di amicizia; REJECTED resta salvato e puo' tornare PENDING (D12). */
public enum FriendshipStatus {
	PENDING,
	ACCEPTED,
	REJECTED
}
