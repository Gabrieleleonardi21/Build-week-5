// make(): unico helper per creare nodi DOM fuori da React (es. icone dei pin di Leaflet,
// che vogliono un HTMLElement gia' pronto). Mai innerHTML: il testo va in textContent,
// quindi nomi e titoli scritti dagli utenti non possono diventare HTML (niente XSS).
type Tag = keyof HTMLElementTagNameMap

type MakeProps<K extends Tag> = Partial<Omit<HTMLElementTagNameMap[K], 'style' | 'innerHTML' | 'outerHTML'>> & {
  style?: Partial<CSSStyleDeclaration>
}

export function make<K extends Tag>(
  tag: K,
  props: MakeProps<K> = {},
  children: ReadonlyArray<Node | string> = [],
): HTMLElementTagNameMap[K] {
  const { style, ...rest } = props
  const element = document.createElement(tag)
  Object.assign(element, rest)
  if (style !== undefined) {
    Object.assign(element.style, style)
  }
  // Le stringhe diventano nodi di testo: append non interpreta mai HTML.
  element.append(...children)
  return element
}
