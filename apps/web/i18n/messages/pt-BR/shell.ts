import type { Shape } from '../../format';
import type { shell as en } from '../en/shell';

/** Mensagens da moldura do app (barra lateral, barra do topo, conta), em português do Brasil */
export const shell = {
  account: {
    menu: 'Conta',
    logout: 'Sair',
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
