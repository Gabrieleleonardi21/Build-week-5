import { z } from 'zod'

// Stessi vincoli del backend (RegisterRequest, LoginRequest, VerifyRequest): l'errore arriva
// subito sotto il campo, in italiano, senza aspettare il server.
const email = z.string().trim().min(1, 'Inserisci la tua email').max(255).email('Email non valida')

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Inserisci la password').max(72, 'Password troppo lunga'),
})
export type LoginValues = z.infer<typeof loginSchema>

function isPastDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00`)
  return !Number.isNaN(date.getTime()) && date.getTime() < Date.now()
}

export const registerSchema = z.object({
  firstName: z.string().trim().min(1, 'Inserisci il nome').max(100, 'Massimo 100 caratteri'),
  lastName: z.string().trim().min(1, 'Inserisci il cognome').max(100, 'Massimo 100 caratteri'),
  email,
  password: z.string().min(8, 'Almeno 8 caratteri').max(72, 'Massimo 72 caratteri'),
  birthDate: z.string().min(1, 'Inserisci la data di nascita').refine(isPastDate, 'La data deve essere nel passato'),
  privacyAccepted: z.boolean().refine((value) => value, 'Per registrarti devi accettare la privacy'),
})
export type RegisterValues = z.infer<typeof registerSchema>

export const verifySchema = z.object({
  email,
  code: z.string().regex(/^\d{6}$/, 'Il codice è di 6 cifre'),
})
export type VerifyValues = z.infer<typeof verifySchema>
