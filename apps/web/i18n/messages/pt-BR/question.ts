import type { Shape } from '@/i18n/format';
import type { question as en } from '@/i18n/messages/en/question';

/** As perguntas de uma página, em português do Brasil: a resposta de quem lê e o que o botão de estudada diz delas */
export const question = {
  answer: 'Sua resposta',
  placeholder: 'Escreva sua resposta…',
  left: { one: 'Falta responder {count} pergunta', other: 'Falta responder {count} perguntas' },
  leftHint: 'Responda às perguntas desta página para marcá-la como estudada. Isto leva você até a próxima.',
  mixedLeft: { one: 'Falta {count} coisa a fazer', other: 'Faltam {count} coisas a fazer' },
  mixedHint: 'Faça as atividades e responda às perguntas desta página para marcá-la como estudada. Isto leva você até a próxima.',
} as const satisfies Shape<typeof en>;
