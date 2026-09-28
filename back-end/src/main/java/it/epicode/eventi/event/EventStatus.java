package it.epicode.eventi.event;

/** Un evento non si cancella fisicamente se ha ticket: passa a CANCELLED e i partecipanti vengono avvisati. */
public enum EventStatus {
	PUBLISHED,
	CANCELLED
}
