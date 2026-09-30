import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import type { Page } from '@/lib/types'

interface PaginationProps {
  page: Page<unknown>['page']
  onPageChange: (page: number) => void
}

/** Pagina precedente/successiva per le liste del backend ({ content, page }). */
export function Pagination({ page, onPageChange }: PaginationProps) {
  if (page.totalPages <= 1) {
    return null
  }
  const current = page.number + 1
  return (
    <nav aria-label="Paginazione" className="flex items-center justify-between gap-4 pt-6">
      <Button
        variant="outline"
        onClick={() => onPageChange(page.number - 1)}
        disabled={page.number === 0}
      >
        <CaretLeftIcon data-icon="inline-start" aria-hidden="true" />
        Precedente
      </Button>
      <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
        Pagina {current} di {page.totalPages}
      </p>
      <Button
        variant="outline"
        onClick={() => onPageChange(page.number + 1)}
        disabled={current >= page.totalPages}
      >
        Successiva
        <CaretRightIcon data-icon="inline-end" aria-hidden="true" />
      </Button>
    </nav>
  )
}
