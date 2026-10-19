import type { Shape } from '@/i18n/format';
import type { catalog as en } from '@/i18n/messages/en/catalog';

/** Mensagens de uma trilha publicada, lida no catálogo, em português do Brasil */
export const catalog = {
  explore: {
    meta: 'Catálogo de trilhas | WisePath',
    description: 'Trilhas escritas por quem estudou o assunto: as anotações, ligadas como um mapa, para estudar com o seu próprio progresso.',
    title: 'Catálogo de trilhas',
    intro: 'Trilhas escritas por quem estudou o assunto: as anotações, ligadas como um mapa. Leia sem conta, ou estude com o seu próprio progresso.',
    languages: 'Idioma',
    all: 'Todas',
    none: 'Ainda não há trilhas aqui.',
    pages: { one: '{count} página', other: '{count} páginas' },
    search: 'Buscar trilhas',
    searchPlaceholder: 'O que você quer aprender?',
    searchSubmit: 'Buscar',
    found: { one: '{count} trilha', other: '{count} trilhas' },
    noneFound: 'Nenhuma trilha para “{q}”.',
    results: 'Páginas de resultados',
    previousPage: 'Anterior',
    nextPage: 'Próxima',
    pageOf: 'Página {page} de {pages}',
    link: 'Catálogo',
  },
  meta: '{page} | {path} | WisePath',
  metaRoot: '{path} | WisePath',
  for: 'Para: {audience}',
  trail: 'Onde esta página fica',
  related: 'Páginas relacionadas',
  pages: 'Páginas desta trilha',
  pager: 'Página anterior e próxima',
  previous: 'Anterior',
  next: 'Próxima',
  empty: 'Esta página ainda não tem texto.',
} as const satisfies Shape<typeof en>;
