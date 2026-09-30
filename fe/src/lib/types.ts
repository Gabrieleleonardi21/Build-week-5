// Nomi leggibili per i tipi generati da docs/openapi.yaml (npm run gen:api).
// Se cambia il backend si rigenera api-schema.ts: questi alias restano gli stessi.
import type { components } from './api-schema'

type Schemas = components['schemas']

export type Role = Schemas['Role']
export type UserStatus = Schemas['UserStatus']
export type EventStatus = Schemas['EventStatus']
export type TicketStatus = Schemas['TicketStatus']
export type MarkerKind = Schemas['MarkerKind']
export type NotificationType = Schemas['NotificationType']

export type UserResponse = Schemas['UserResponse']
export type RegisterRequest = Schemas['RegisterRequest']
export type LoginRequest = Schemas['LoginRequest']
export type VerifyRequest = Schemas['VerifyRequest']

export type EventRequest = Schemas['EventRequest']
export type EventResponse = Schemas['EventResponse']
export type EventSummaryResponse = Schemas['EventSummaryResponse']
export type EventPinResponse = Schemas['EventPinResponse']
export type EventImageResponse = Schemas['EventImageResponse']
export type LineupEntryRequest = Schemas['LineupEntryRequest']
export type LineupEntryResponse = Schemas['LineupEntryResponse']
export type MarkerRequest = Schemas['MarkerRequest']
export type MarkerResponse = Schemas['MarkerResponse']
export type AiDescriptionResponse = Schemas['AiDescriptionResponse']

export type ArtistRequest = Schemas['ArtistRequest']
export type ArtistResponse = Schemas['ArtistResponse']

export type TicketResponse = Schemas['TicketResponse']
export type ParticipantResponse = Schemas['ParticipantResponse']

export type NotificationResponse = Schemas['NotificationResponse']
export type UnreadCountResponse = Schemas['UnreadCountResponse']

export type UserSummaryResponse = Schemas['UserSummaryResponse']
export type FriendResponse = Schemas['FriendResponse']
export type FriendRequestResponse = Schemas['FriendRequestResponse']
export type ChatMessageResponse = Schemas['ChatMessageResponse']
export type ChatSummaryResponse = Schemas['ChatSummaryResponse']

export type ProfileResponse = Schemas['ProfileResponse']
export type UpdateProfileRequest = Schemas['UpdateProfileRequest']
export type AdminUserResponse = Schemas['AdminUserResponse']

/** Tutte le liste paginate del backend hanno questa forma (PageConfig, VIA_DTO). */
export interface Page<T> {
  content: T[]
  page: Schemas['PageMeta']
}
