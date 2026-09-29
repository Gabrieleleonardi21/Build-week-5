package it.epicode.eventi.event;

import java.util.UUID;

/**
 * Contratto tra eventi e notifiche: il service eventi lo pubblica quando il
 * proprietario modifica (cancelled = false) o annulla (cancelled = true) un evento.
 * Il modulo notifiche avvisa tutti i possessori di ticket VALID (D11).
 */
public record EventChanged(UUID eventId, boolean cancelled) {
}
