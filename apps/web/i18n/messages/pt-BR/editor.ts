import type { Shape } from '../../format';
import type { editor as en } from '../en/editor';

/** Mensagens da área editor, em português do Brasil */
export const editor = {} as const satisfies Shape<typeof en>;
