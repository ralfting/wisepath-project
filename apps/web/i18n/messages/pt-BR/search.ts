import type { Shape } from '@/i18n/format';
import type { search as en } from '@/i18n/messages/en/search';

/** Mensagens da busca em todas as trilhas (a paleta do ⌘P), em português do Brasil */
export const search = {
  open: 'Buscar páginas',
  palette: {
    label: 'Buscar em todas as trilhas',
    placeholder: 'Buscar páginas em todas as trilhas',
    results: 'Páginas encontradas',
  },
  recent: {
    title: 'Abertas recentemente',
    empty: 'As páginas que você abrir aparecem aqui. Digite para buscar em todas as trilhas.',
  },
  found: {
    title: { one: '{count} página', other: '{count} páginas' },
    none: 'Nenhuma página tem “{query}” no título ou no texto.',
    searching: 'Buscando…',
  },
  hints: {
    move: 'navegar',
    open: 'abrir no mapa',
    full: 'abrir em página inteira',
    close: 'fechar',
  },
} as const satisfies Shape<typeof en>;
