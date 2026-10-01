import { act, renderHook } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { describe, expect, it } from 'vitest'
import { make } from './dom'
import { ApiError } from './errors'
import { applyFieldErrors } from './form-errors'
import { formatDateTime, formatRelative, formatTimeRange, fromLocalInputValue, toLocalInputValue } from './format'
import { toQuery } from './query'
import { hasRole } from './roles'

describe('toQuery', () => {
  it('salta vuoti, null e undefined', () => {
    expect(toQuery({ q: 'jazz', city: '', page: 0, size: undefined, x: null })).toBe('?q=jazz&page=0')
    expect(toQuery({})).toBe('')
  })
})

describe('hasRole', () => {
  it('rispetta la gerarchia USER < MODERATOR < SUPERADMIN', () => {
    expect(hasRole({ role: 'SUPERADMIN' }, 'MODERATOR')).toBe(true)
    expect(hasRole({ role: 'MODERATOR' }, 'MODERATOR')).toBe(true)
    expect(hasRole({ role: 'USER' }, 'MODERATOR')).toBe(false)
    expect(hasRole(null, 'USER')).toBe(false)
  })
})

describe('format', () => {
  it('mostra le date nel fuso italiano', () => {
    // 19:00 UTC di giugno = 21:00 in Italia (ora legale)
    expect(formatDateTime('2027-06-14T19:00:00Z')).toContain('21:00')
    expect(formatTimeRange('2027-06-14T19:00:00Z', '2027-06-14T20:30:00Z')).toBe('21:00 - 22:30')
    expect(formatTimeRange('2027-06-14T19:00:00Z', null)).toBe('21:00')
    expect(formatTimeRange(null, null)).toBe('')
  })

  it('datetime-local andata e ritorno senza perdere l\'istante', () => {
    const iso = '2027-06-14T19:00:00.000Z'
    expect(fromLocalInputValue(toLocalInputValue(iso))).toBe(iso)
  })

  it('tempo relativo', () => {
    const now = new Date('2027-06-14T12:00:00Z')
    expect(formatRelative('2027-06-14T11:57:00Z', now)).toBe('3 minuti fa')
    expect(formatRelative('2027-06-14T11:59:50Z', now)).toBe('adesso')
    expect(formatRelative('2027-06-13T12:00:00Z', now)).toBe('ieri')
  })
})

describe('make', () => {
  it('crea elementi con proprieta\', stile e figli', () => {
    const child = make('span', { className: 'foro' })
    const pin = make('div', { className: 'pin', title: 'Ingresso', style: { backgroundColor: 'red' } }, [child, 'A'])

    expect(pin.tagName).toBe('DIV')
    expect(pin.className).toBe('pin')
    expect(pin.title).toBe('Ingresso')
    expect(pin.style.backgroundColor).toBe('red')
    expect(pin.firstChild).toBe(child)
    expect(pin.textContent).toBe('A')
  })

  it('il testo resta testo: niente HTML interpretato (XSS)', () => {
    const label = make('span', { textContent: '<img src=x onerror=alert(1)>' })

    expect(label.querySelector('img')).toBeNull()
    expect(label.textContent).toBe('<img src=x onerror=alert(1)>')
  })

  it('innerHTML non e\' accettato dal tipo', () => {
    // @ts-expect-error innerHTML e' escluso da MakeProps
    make('div', { innerHTML: '<b>x</b>' })
  })
})

describe('applyFieldErrors', () => {
  it('mette gli errori sotto i campi e quelli sconosciuti in root.server', () => {
    const { result } = renderHook(() => {
      const form = useForm({ defaultValues: { title: '', lineup: [{ artistName: '' }] } })
      // Letto durante il render: react-hook-form aggiorna formState.errors solo se qualcuno lo osserva.
      void form.formState.errors
      return form
    })
    const error = new ApiError(400, 'Dati non validi', {
      fieldErrors: { title: 'obbligatorio', 'lineup[0].artistName': 'troppo lungo', segreto: 'x' },
    })

    let applied = false
    act(() => {
      applied = applyFieldErrors(result.current, error)
    })

    expect(applied).toBe(true)
    expect(result.current.getFieldState('title').error?.message).toBe('obbligatorio')
    expect(result.current.getFieldState('lineup.0.artistName').error?.message).toBe('troppo lungo')
    expect(result.current.formState.errors.root?.server?.message).toBe('x')
  })

  it('senza errori di campo non tocca il form', () => {
    const { result } = renderHook(() => useForm({ defaultValues: { title: '' } }))

    expect(applyFieldErrors(result.current, new ApiError(409, 'conflitto'))).toBe(false)
    expect(applyFieldErrors(result.current, new Error('altro'))).toBe(false)
  })
})
