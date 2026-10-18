import type { Shape } from '@/i18n/format';
import type { admin as en } from '@/i18n/messages/en/admin';

/** Mensagens para as pessoas que administram o WisePath (revisar pedidos de publicação), em português do Brasil */
export const admin = {
  publications: {
    meta: 'Pedidos de publicação | WisePath',
    title: 'Pedidos de publicação',
    intro: 'Trilhas que as pessoas pediram para listar no catálogo. Leia cada uma antes de decidir.',
    none: 'Nada aguardando revisão.',
    by: 'De {name}',
    pages: { one: '{count} página', other: '{count} páginas' },
    askedOn: 'Pedido {date}',
    for: 'Para: {audience}',
    language: 'Escrita em {language}',
    read: 'Ler a trilha',
    approve: 'Aprovar',
    decline: 'Recusar',
    decided: 'Este pedido já foi decidido ou retirado.',
  },
} as const satisfies Shape<typeof en>;
