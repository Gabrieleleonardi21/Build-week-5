import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Pagination } from '@/components/data/Pagination'
import { StatusBadge } from '@/components/data/StatusBadge'
import { UserAvatar } from '@/components/data/UserAvatar'
import { EmptyState } from '@/components/feedback/EmptyState'
import { QueryState } from '@/components/feedback/QueryState'
import { ConfirmDialog } from '@/components/form/ConfirmDialog'
import { FormField } from '@/components/form/FormField'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/errors'

describe('FormField', () => {
  it('collega etichetta, aiuto ed errore al controllo', () => {
    render(
      <FormField id="title" label="Titolo" description="Massimo 150 caratteri" error="Obbligatorio">
        {(control) => <input {...control} />}
      </FormField>,
    )
    const input = screen.getByLabelText('Titolo')

    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Massimo 150 caratteri Obbligatorio')
    expect(screen.getByRole('alert')).toHaveTextContent('Obbligatorio')
  })

  it('senza errore niente aria-invalid e niente alert', () => {
    render(<FormField id="city" label="Città">{(control) => <input {...control} />}</FormField>)

    expect(screen.getByLabelText('Città')).toHaveAttribute('aria-invalid', 'false')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('QueryState', () => {
  interface FakeQuery {
    data: string[] | undefined
    isPending: boolean
    isError: boolean
    error: unknown
    refetch: () => void
  }
  const base: FakeQuery = { data: undefined, isPending: false, isError: false, error: null, refetch: vi.fn() }

  it('caricamento, errore con Riprova, vuoto e contenuto', async () => {
    const view = (query: FakeQuery) => (
      <QueryState<string[]>
        query={query as never}
        loading={<p>Caricamento</p>}
        isEmpty={(data) => data.length === 0}
        empty={<p>Nessun evento</p>}
      >
        {(data) => <p>{data.join(',')}</p>}
      </QueryState>
    )
    const { rerender } = render(view({ ...base, isPending: true }))
    expect(screen.getByText('Caricamento')).toBeInTheDocument()

    const refetch = vi.fn()
    rerender(view({ ...base, isError: true, error: new ApiError(503, 'Servizio giù'), refetch }))
    expect(screen.getByRole('alert')).toHaveTextContent('Servizio giù')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Riprova' }))
    expect(refetch).toHaveBeenCalled()

    rerender(view({ ...base, data: [] }))
    expect(screen.getByText('Nessun evento')).toBeInTheDocument()

    rerender(view({ ...base, data: ['jazz', 'folk'] }))
    expect(screen.getByText('jazz,folk')).toBeInTheDocument()
  })
})

describe('Pagination', () => {
  it('nascosta con una pagina sola', () => {
    const { container } = render(
      <Pagination page={{ size: 20, number: 0, totalElements: 3, totalPages: 1 }} onPageChange={vi.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('precedente disabilitato sulla prima pagina, successiva cambia pagina', async () => {
    const onPageChange = vi.fn()
    render(<Pagination page={{ size: 20, number: 0, totalElements: 45, totalPages: 3 }} onPageChange={onPageChange} />)

    expect(screen.getByText('Pagina 1 di 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Precedente' })).toBeDisabled()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Successiva' }))
    expect(onPageChange).toHaveBeenCalledWith(1)
  })
})

describe('StatusBadge, UserAvatar, EmptyState', () => {
  it('stato evento: annullato, concluso, nulla se futuro', () => {
    const { rerender, container } = render(<StatusBadge status="CANCELLED" />)
    expect(screen.getByText('Annullato')).toBeInTheDocument()
    rerender(<StatusBadge status="PUBLISHED" endsAt="2020-01-01T20:00:00Z" />)
    expect(screen.getByText('Concluso')).toBeInTheDocument()
    rerender(<StatusBadge status="PUBLISHED" endsAt="2099-01-01T20:00:00Z" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('avatar senza foto mostra le iniziali con il nome per gli screen reader', () => {
    render(<UserAvatar firstName="Luca" lastName="Moretti" avatarUrl={null} />)
    expect(screen.getByLabelText('Luca Moretti')).toHaveTextContent('LM')
  })

  it('stato vuoto con azione', () => {
    render(<EmptyState title="Nessun ticket" description="Iscriviti a un evento" action={<button>Scopri</button>} />)
    expect(screen.getByRole('heading', { name: 'Nessun ticket' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Scopri' })).toBeInTheDocument()
  })
})

describe('ConfirmDialog', () => {
  it('chiede conferma; se l\'azione fallisce resta aperta', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn().mockRejectedValueOnce(new ApiError(409, 'Evento con partecipanti')).mockResolvedValueOnce(undefined)
    render(
      <ConfirmDialog
        trigger={<Button>Elimina</Button>}
        title="Eliminare l'evento?"
        description="L'operazione non si può annullare."
        confirmLabel="Elimina definitivamente"
        destructive
        onConfirm={onConfirm}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Elimina' }))
    await user.click(await screen.findByRole('button', { name: 'Elimina definitivamente' }))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Elimina definitivamente' }))
    await vi.waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(onConfirm).toHaveBeenCalledTimes(2)
  })
})

describe('MobileNav', () => {
  it('da anonimo il menu mobile offre Accedi e Registrati', async () => {
    const { MobileNav } = await import('@/components/layout/MobileNav')
    const { MemoryRouter } = await import('react-router')
    render(
      <MemoryRouter>
        <MobileNav user={null} />
      </MemoryRouter>,
    )

    await userEvent.setup().click(screen.getByRole('button', { name: 'Apri il menu' }))

    expect(await screen.findByRole('link', { name: 'Accedi' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Registrati' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Profilo' })).not.toBeInTheDocument()
  })
})
