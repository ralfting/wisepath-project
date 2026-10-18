import type { Shape } from '@/i18n/format';
import type { catalog as en } from '@/i18n/messages/en/catalog';

/** Mensagens de uma trilha publicada, lida no catálogo, em português do Brasil */
export const catalog = {
  meta: '{page} | {path} | WisePath',
  metaRoot: '{path} | WisePath',
  badge: 'Catálogo do WisePath',
  for: 'Para {audience}',
  trail: 'Onde esta página fica',
  related: 'Páginas relacionadas',
  pages: 'Páginas desta trilha',
  empty: 'Esta página ainda não tem texto.',
} as const satisfies Shape<typeof en>;
