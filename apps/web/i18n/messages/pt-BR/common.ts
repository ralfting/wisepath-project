import type { Shape } from '@/i18n/format';
import type { common as en } from '@/i18n/messages/en/common';

/** Mensagens usadas em todo o app, em português do Brasil */
export const common = {
  untitledPage: 'Página sem título',
  language: {
    menu: 'Idioma',
    current: '{name}, em uso',
  },
  actions: {
    cancel: 'Cancelar',
    close: 'Fechar',
    delete: 'Excluir',
    save: 'Salvar',
    retry: 'Tentar de novo',
  },
  notFound: {
    title: 'Página não encontrada',
    body: 'Este endereço não existe ou o link está errado.',
    home: 'Ir para o WisePath',
  },
  errors: {
    unavailable: 'Não foi possível falar com o WisePath agora. Tente de novo em instantes.',
    generic: 'Algo deu errado. Tente de novo em instantes.',
    signedOut: 'Sua sessão terminou. Entre de novo para continuar.',
  },
} as const satisfies Shape<typeof en>;
