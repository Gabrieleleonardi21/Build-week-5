package it.epicode.eventi.social;

import it.epicode.eventi.social.dto.ChatMessageResponse;

import java.util.List;

/** Messaggio salvato, da spingere ai due utenti dopo il commit. */
public record ChatMessageSent(List<String> recipientUsernames, ChatMessageResponse payload) {
}
