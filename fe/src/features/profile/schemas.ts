import { z } from 'zod'

// Stessi vincoli del backend (UpdateProfileRequest, AddressDto, ChangePasswordRequest, DeleteAccountRequest):
// l'errore arriva subito sotto il campo, in italiano, senza aspettare il server.

function isPastDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00`)
  return !Number.isNaN(date.getTime()) && date.getTime() < Date.now()
}

// I campi facoltativi restano stringhe (vuota = non indicato): il backend trasforma i vuoti in null.
export const profileSchema = z.object({
  firstName: z.string().trim().min(1, 'Inserisci il nome').max(100, 'Massimo 100 caratteri'),
  lastName: z.string().trim().min(1, 'Inserisci il cognome').max(100, 'Massimo 100 caratteri'),
  birthDate: z.string().min(1, 'Inserisci la data di nascita').refine(isPastDate, 'La data deve essere nel passato'),
  phone: z
    .string()
    .trim()
    .regex(/^(\+?[0-9 ]{6,29})?$/, 'Numero non valido: solo cifre e spazi, da 6 a 29, con + iniziale facoltativo'),
  // Annidato come nel backend: gli errori "address.province" finiscono sotto il campo giusto.
  address: z.object({
    street: z.string().trim().max(255, 'Massimo 255 caratteri'),
    city: z.string().trim().max(100, 'Massimo 100 caratteri'),
    postalCode: z.string().trim().regex(/^[0-9A-Za-z -]{0,10}$/, 'CAP non valido'),
    province: z.string().trim().regex(/^([A-Za-z]{2})?$/, 'Sigla di 2 lettere, es. MI'),
    country: z.string().trim().regex(/^([A-Za-z]{2})?$/, 'Codice di 2 lettere, es. IT'),
  }),
})
export type ProfileValues = z.infer<typeof profileSchema>

export const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Inserisci la password attuale').max(72, 'Massimo 72 caratteri'),
    newPassword: z.string().min(8, 'Almeno 8 caratteri').max(72, 'Massimo 72 caratteri'),
    confirmPassword: z.string().min(1, 'Ripeti la nuova password'),
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    path: ['newPassword'],
    message: 'La nuova password deve essere diversa da quella attuale',
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Le due password non coincidono',
  })
export type PasswordValues = z.infer<typeof passwordSchema>

export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Inserisci la password').max(72, 'Massimo 72 caratteri'),
})
export type DeleteAccountValues = z.infer<typeof deleteAccountSchema>
