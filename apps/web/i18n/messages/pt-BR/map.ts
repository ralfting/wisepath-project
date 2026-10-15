import type { Shape } from '../../format';
import type { map as en } from '../en/map';

/** Mensagens da área map, em português do Brasil */
export const map = {} as const satisfies Shape<typeof en>;
