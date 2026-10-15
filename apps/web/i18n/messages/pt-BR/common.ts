import type { Shape } from '../../format';
import type { common as en } from '../en/common';

/** Mensagens usadas em todo o app, em português do Brasil */
export const common = {
  language: {
    menu: 'Idioma',
    sameAsBrowser: 'Igual ao navegador',
    current: '{name}, em uso',
  },
  actions: {
    cancel: 'Cancelar',
    close: 'Fechar',
    delete: 'Excluir',
    save: 'Salvar',
    retry: 'Tentar de novo',
  },
  errors: {
    unavailable: 'Não foi possível falar com o WisePath agora. Tente de novo em instantes.',
    generic: 'Algo deu errado. Tente de novo em instantes.',
  },
} as const satisfies Shape<typeof en>;
