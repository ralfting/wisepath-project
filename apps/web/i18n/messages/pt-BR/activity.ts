import type { Shape } from '@/i18n/format';
import type { activity as en } from '@/i18n/messages/en/activity';

/** As atividades de uma página, em português do Brasil: marcá-las, o botão de estudada que elas seguram, o selo */
export const activity = {
  markDone: 'Marcar como feita',
  done: 'Feita',
  left: { one: 'Falta {count} atividade', other: 'Faltam {count} atividades' },
  leftHint: 'Faça as atividades desta página para marcá-la como estudada. Isto leva você até a próxima.',
  badge: {
    has: 'Tem atividades',
    open: { one: '{count} atividade aberta', other: '{count} atividades abertas' },
    done: 'Atividades feitas',
  },
} as const satisfies Shape<typeof en>;
