type QueryValue = string | number | boolean | null | undefined

/** Parametri -> "?a=1&b=due". Vuoti, null e undefined si saltano: niente "?q=" inutili. */
export function toQuery(params: Readonly<Record<string, QueryValue>>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') {
      continue
    }
    search.append(key, String(value))
  }
  const text = search.toString()
  if (text === '') {
    return ''
  }
  return `?${text}`
}
