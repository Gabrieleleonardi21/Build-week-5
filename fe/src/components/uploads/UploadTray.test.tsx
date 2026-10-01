import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FakeXhr } from '@/test/fake-xhr'
import { UploadManager } from '@/lib/upload-manager'
import { UploadTray } from './UploadTray'

function image(name: string): File {
  return new File([new Uint8Array(100)], name, { type: 'image/png' })
}

let manager: UploadManager

beforeEach(() => {
  FakeXhr.instances = []
  vi.stubGlobal('XMLHttpRequest', FakeXhr)
  URL.createObjectURL = vi.fn(() => 'blob:anteprima')
  URL.revokeObjectURL = vi.fn()
  manager = new UploadManager()
})
afterEach(() => vi.unstubAllGlobals())

describe('UploadTray', () => {
  it('non mostra nulla senza upload', () => {
    const { container } = render(<UploadTray manager={manager} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('mostra avanzamento, errore con Riprova, e annulla', async () => {
    const user = userEvent.setup()
    render(<UploadTray manager={manager} />)
    act(() => {
      manager.enqueue([image('palco.png'), image('pubblico.png')], { kind: 'event-image', eventId: 'e1' })
    })
    await vi.waitFor(() => expect(FakeXhr.instances).toHaveLength(2))

    act(() => FakeXhr.instances[0]?.progress(30, 100))
    expect(await screen.findByText('Invio 30%')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Caricamento di 2 immagini' })).toBeInTheDocument()

    act(() => FakeXhr.instances[1]?.respond(413, ''))
    expect(await screen.findByText('Il file supera i 5 MB.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Riprova pubblico.png' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Annulla palco.png' }))
    expect(FakeXhr.instances[0]?.aborted).toBe(true)
    expect(screen.getByText('Annullato')).toBeInTheDocument()
  })

  it('chiede conferma prima di chiudere la scheda con upload in corso', async () => {
    const add = vi.spyOn(window, 'addEventListener')
    render(<UploadTray manager={manager} />)
    act(() => {
      manager.enqueue([image('a.png')], { kind: 'avatar' })
    })

    await vi.waitFor(() => expect(add).toHaveBeenCalledWith('beforeunload', expect.any(Function)))
  })
})
