package it.epicode.eventi.social.dto;

import it.epicode.eventi.user.dto.UserSummaryResponse;

import java.util.UUID;

/**
 * Una conversazione nella bandeja delle chat, come su Instagram: con chi, l'ultimo
 * messaggio e quanti non ne hai letti. canWrite = false se non siete piu' amici o se
 * l'altro ha cancellato/disattivato l'account (Friendship.isChatOpen):
 * lo storico resta leggibile, ma non si puo' scrivere.
 */
public record ChatSummaryResponse(UUID chatId, UserSummaryResponse user, boolean canWrite,
		ChatMessageResponse lastMessage, long unreadMessages) {
}
