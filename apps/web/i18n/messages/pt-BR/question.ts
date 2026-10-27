import type { Shape } from '@/i18n/format';
import type { question as en } from '@/i18n/messages/en/question';

/** As perguntas de uma página, em português do Brasil: a resposta de quem lê */
export const question = {
  answer: 'Sua resposta',
  placeholder: 'Escreva sua resposta…',
} as const satisfies Shape<typeof en>;
