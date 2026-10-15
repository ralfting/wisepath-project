import type { Shape } from '../../format';
import type { auth as en } from '../en/auth';

/** Mensagens da área auth, em português do Brasil */
export const auth = {} as const satisfies Shape<typeof en>;
