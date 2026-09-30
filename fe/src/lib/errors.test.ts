import { describe, expect, it } from 'vitest'
import { ApiError, errorMessage, parseProblem } from './errors'

describe('parseProblem', () => {
  it('usa detail, errors e code del ProblemDetail', () => {
    const body = JSON.stringify({
      status: 403,
      detail: 'Email non verificata',
      code: 'EMAIL_NOT_VERIFIED',
      errors: { email: 'non valida', ignorato: 42 },
    })

    const error = parseProblem(403, body, null)

    expect(error.message).toBe('Email non verificata')
    expect(error.code).toBe('EMAIL_NOT_VERIFIED')
    expect(error.fieldErrors).toEqual({ email: 'non valida' })
    expect(error.hasDetail).toBe(true)
  })

  it('legge Retry-After in secondi', () => {
    expect(parseProblem(429, '', '900').retryAfterSeconds).toBe(900)
    expect(parseProblem(429, '', 'domani').retryAfterSeconds).toBeNull()
  })

  it('con body vuoto o non JSON usa il messaggio del codice HTTP', () => {
    expect(parseProblem(404, '', null).message).toBe('Risorsa non trovata.')
    expect(parseProblem(502, '<html>Bad gateway</html>', null).message).toBe('Errore 502')
    expect(parseProblem(403, '{"error":"Forbidden"}', null).hasDetail).toBe(false)
  })
})

describe('errorMessage', () => {
  it('gestisce ApiError, Error e valori sconosciuti', () => {
    expect(errorMessage(new ApiError(409, 'Sei gia\' iscritto'))).toBe("Sei gia' iscritto")
    expect(errorMessage(new Error('rotto'))).toBe('rotto')
    expect(errorMessage('boh')).toBe('Si è verificato un errore imprevisto.')
  })
})
