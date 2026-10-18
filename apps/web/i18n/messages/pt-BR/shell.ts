import type { Shape } from '@/i18n/format';
import type { shell as en } from '@/i18n/messages/en/shell';

/** Mensagens da moldura do app (barra lateral, barra do topo, conta), em português do Brasil */
export const shell = {
  account: {
    menu: 'Conta',
    logout: 'Sair',
    download: 'Baixar meus caminhos',
  },
  sidebar: {
    label: 'Barra lateral',
    home: 'WisePath, minhas trilhas',
    myPaths: 'Minhas trilhas',
    paths: 'Trilhas',
    collapse: 'Recolher a barra lateral',
    keepOpen: 'Manter a barra lateral aberta',
    openNavigation: 'Abrir a navegação',
  },
  rail: {
    pathProgress: '{title}, {percent}% estudada',
  },
} as const satisfies Shape<typeof en>;
