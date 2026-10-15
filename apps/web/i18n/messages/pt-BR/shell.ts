import type { Shape } from '../../format';
import type { shell as en } from '../en/shell';

/** Mensagens da moldura do app (barra lateral, barra do topo, conta), em português do Brasil */
export const shell = {
  account: {
    logout: 'Sair',
  },
} as const satisfies Shape<typeof en>;
