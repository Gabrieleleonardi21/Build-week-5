import { describe, expect, it } from 'vitest'
import { MARKER_LABELS, markerIcon, venuePinIcon } from './pin-icons'

describe('pin-icons', () => {
  it('i marker sono HTMLElement costruiti con make(): classe, lettera e dimensioni', () => {
    const icon = markerIcon('EMERGENCY_EXIT')
    const html = icon.options.html

    expect(html).toBeInstanceOf(HTMLElement)
    const element = html as HTMLElement
    expect(element.className).toBe('map-marker map-marker--emergency')
    expect(element.textContent).toBe('!')
    expect(icon.options.iconSize).toEqual([26, 26])
  })

  it('pin del luogo ed etichette in italiano', () => {
    const html = venuePinIcon().options.html as HTMLElement
    expect(html.querySelector('.map-pin__dot')).not.toBeNull()
    expect(MARKER_LABELS).toEqual({ ENTRANCE: 'Ingresso', EXIT: 'Uscita', EMERGENCY_EXIT: 'Uscita di emergenza' })
  })
})

describe('venuePinIcon', () => {
  it('ogni chiamata crea un elemento nuovo (condiviso tra marker resterebbe visibile solo sull\'ultimo)', () => {
    const first = venuePinIcon().options.html
    const second = venuePinIcon().options.html

    expect(first).not.toBe(second)
  })
})
