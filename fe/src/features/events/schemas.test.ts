import { describe, expect, it } from 'vitest'
import { fromLocalInputValue, toLocalInputValue } from '@/lib/format'
import type { EventResponse } from '@/lib/types'
import { EMPTY_EVENT_FORM, eventFormSchema, parseCoordinate, toEventRequest, toFormValues, type EventFormValues } from './schemas'

function valid(overrides: Partial<EventFormValues> = {}): EventFormValues {
  return {
    ...EMPTY_EVENT_FORM,
    title: 'Jazz sotto le stelle',
    startsAt: '2099-06-14T21:00',
    address: 'Piazza Maggiore 1',
    city: 'Bologna',
    latitude: '44.49',
    longitude: '11.34',
    ...overrides,
  }
}

function messages(values: EventFormValues, savedStartsAt: string | null = null): Record<string, string> {
  const result = eventFormSchema(savedStartsAt).safeParse(values)
  const found: Record<string, string> = {}
  if (!result.success) {
    for (const issue of result.error.issues) {
      // Come react-hook-form: di ogni campo conta il primo messaggio.
      found[issue.path.join('.')] ??= issue.message
    }
  }
  return found
}

describe('eventFormSchema', () => {
  it('accetta un evento con i soli campi obbligatori', () => {
    expect(messages(valid())).toEqual({})
  })

  it('segnala i campi obbligatori mancanti e la posizione non scelta', () => {
    const found = messages(EMPTY_EVENT_FORM)
    expect(found.title).toBe('Inserisci il titolo')
    expect(found.startsAt).toBe('Inserisci data e ora di inizio')
    expect(found.address).toBe("Inserisci l'indirizzo")
    expect(found.city).toBe('Inserisci la città')
    expect(found.latitude).toMatch(/Scegli il punto sulla mappa/)
    expect(found.longitude).toMatch(/Scegli il punto sulla mappa/)
  })

  it("l'inizio deve essere nel futuro, ma in modifica quello salvato si puo' lasciare", () => {
    const past = '2020-01-01T20:00'
    expect(messages(valid({ startsAt: past })).startsAt).toBe("L'inizio deve essere nel futuro")
    expect(messages(valid({ startsAt: past }), past)).toEqual({})
    expect(messages(valid({ startsAt: '2020-01-02T20:00' }), past).startsAt).toBe("L'inizio deve essere nel futuro")
  })

  it('la fine non precede l\'inizio; provincia, capienza e coordinate hanno un formato', () => {
    const found = messages(valid({ endsAt: '2099-06-14T20:00', province: 'BOL', maxParticipants: '0', latitude: '91', longitude: 'abc' }))
    expect(found.endsAt).toBe("La fine non può precedere l'inizio")
    expect(found.province).toBe('La provincia è una sigla di 2 lettere')
    expect(found.maxParticipants).toMatch(/maggiore di zero/)
    expect(found.latitude).toBeDefined()
    expect(found.longitude).toBeDefined()
  })

  it('scaletta: nome obbligatorio, niente artisti ripetuti (senza distinguere maiuscole), orari coerenti', () => {
    const found = messages(
      valid({
        lineup: [
          { artistName: 'Blue Trio', performanceStart: '2099-06-14T22:00', performanceEnd: '2099-06-14T21:00' },
          { artistName: ' blue trio ', performanceStart: '', performanceEnd: '' },
          { artistName: '', performanceStart: '', performanceEnd: '' },
        ],
      }),
    )
    expect(found['lineup.0.performanceEnd']).toBe("La fine non può precedere l'inizio")
    expect(found['lineup.1.artistName']).toBe('Artista già in scaletta')
    expect(found['lineup.2.artistName']).toBe("Inserisci il nome dell'artista")
  })

  it('massimo 30 artisti e 30 marker', () => {
    const lineup = Array.from({ length: 31 }, (_, index) => ({ artistName: `Artista ${index}`, performanceStart: '', performanceEnd: '' }))
    const markers = Array.from({ length: 31 }, () => ({ kind: 'EXIT' as const, label: '', latitude: '1', longitude: '1' }))
    const found = messages(valid({ lineup, markers }))
    expect(found.lineup).toBe('Massimo 30 artisti')
    expect(found.markers).toBe('Massimo 30 marker')
  })
})

describe('parseCoordinate', () => {
  it('accetta punto e virgola, rifiuta il vuoto', () => {
    expect(parseCoordinate('45,46')).toBe(45.46)
    expect(parseCoordinate(' 9.19 ')).toBe(9.19)
    expect(parseCoordinate('')).toBeNaN()
  })
})

describe('toEventRequest / toFormValues', () => {
  it('converte stringhe vuote in null, numeri e date in ISO', () => {
    const request = toEventRequest(
      valid({
        title: '  Jazz  ',
        province: 'bo',
        maxParticipants: '300',
        endsAt: '2099-06-14T23:30',
        lineup: [{ artistName: ' Blue Trio ', performanceStart: '2099-06-14T21:00', performanceEnd: '' }],
        markers: [{ kind: 'ENTRANCE', label: '', latitude: '44,5', longitude: '11.3' }],
      }),
    )
    expect(request).toEqual({
      title: 'Jazz',
      description: null,
      startsAt: fromLocalInputValue('2099-06-14T21:00'),
      endsAt: fromLocalInputValue('2099-06-14T23:30'),
      venueName: null,
      address: 'Piazza Maggiore 1',
      city: 'Bologna',
      province: 'BO',
      latitude: 44.49,
      longitude: 11.34,
      maxParticipants: 300,
      lineup: [{ artistName: 'Blue Trio', performanceStart: fromLocalInputValue('2099-06-14T21:00'), performanceEnd: null }],
      markers: [{ kind: 'ENTRANCE', label: null, latitude: 44.5, longitude: 11.3 }],
    })
  })

  it("in modifica, l'inizio non toccato torna identico a quello salvato (secondi compresi)", () => {
    const saved = { startsAt: '2020-01-01T19:00:42Z' }
    const untouched = toEventRequest(valid({ startsAt: toLocalInputValue(saved.startsAt) }), saved)
    expect(untouched.startsAt).toBe(saved.startsAt)
    const moved = toEventRequest(valid({ startsAt: '2099-01-01T20:00' }), saved)
    expect(moved.startsAt).toBe(fromLocalInputValue('2099-01-01T20:00'))
  })

  it('evento salvato -> valori del form, con i null come stringhe vuote', () => {
    const event = {
      title: 'Jazz',
      description: null,
      startsAt: '2099-06-14T19:00:00Z',
      endsAt: null,
      venueName: null,
      address: 'Via Roma 1',
      city: 'Bologna',
      province: null,
      latitude: 44.49,
      longitude: 11.34,
      maxParticipants: null,
      lineup: [{ artistId: 'a1', artistName: 'Blue Trio', genre: null, imageUrl: null, performanceOrder: 1, performanceStart: null, performanceEnd: null, posterUrl: null }],
      markers: [{ id: 'm1', kind: 'EXIT', label: null, latitude: 44.5, longitude: 11.3 }],
    } as unknown as EventResponse
    expect(toFormValues(event)).toEqual({
      title: 'Jazz',
      description: '',
      startsAt: toLocalInputValue('2099-06-14T19:00:00Z'),
      endsAt: '',
      venueName: '',
      address: 'Via Roma 1',
      city: 'Bologna',
      province: '',
      latitude: '44.49',
      longitude: '11.34',
      maxParticipants: '',
      lineup: [{ artistName: 'Blue Trio', performanceStart: '', performanceEnd: '' }],
      markers: [{ kind: 'EXIT', label: '', latitude: '44.5', longitude: '11.3' }],
    })
  })
})
