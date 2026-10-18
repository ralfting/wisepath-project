import type { Shape } from '@/i18n/format';
import type { map as en } from '@/i18n/messages/en/map';

/** Mensagens da área map, em português do Brasil */
export const map = {
  pages: { one: '{count} página', other: '{count} páginas' },
  status: {
    done: 'Estudada',
    current: 'A seguir',
    todo: 'Não iniciada',
  },
  view: {
    label: 'Visualização',
    map: 'Mapa',
    list: 'Lista',
  },
  header: {
    more: 'Mais opções para {title}',
  },
  search: {
    label: 'Buscar nesta trilha',
    labelWithKeys: 'Buscar nesta trilha {keys}',
    placeholder: 'Buscar páginas…',
    withQuery: 'Buscar nesta trilha: {query}',
    clear: 'Limpar a busca',
  },
  results: {
    count: { zero: 'Nenhuma página encontrada', one: '{count} página', other: '{count} páginas' },
    label: 'Páginas encontradas',
    centre: 'Página principal',
    offMap: 'Fora do mapa',
    inPage: 'Em {title}',
  },
  continue: {
    summary: { one: '{studied} de {count} página estudada', other: '{studied} de {count} páginas estudadas' },
    count: { one: '{studied}/{count} página', other: '{studied}/{count} páginas' },
    allStudied: { one: '{count} página estudada', other: 'Todas as {count} páginas estudadas' },
    start: 'Começar',
    continue: 'Continuar',
    startStudying: 'Começar a estudar',
    continueStudying: 'Continuar estudando',
    startStudyingPage: 'Começar a estudar: {title}',
    continueStudyingPage: 'Continuar estudando: {title}',
    opens: 'Abre {title}',
  },
  ghost: {
    label: '{title}, ainda não criada. Criar',
  },
  mind: {
    label: 'Mapa de {title}. As setas movem entre as páginas, Enter abre uma.',
    module: 'módulo',
    belowStudied: { one: '{studied} de {count} abaixo estudada', other: '{studied} de {count} abaixo estudadas' },
    pagesBelow: { one: '{count} página abaixo', other: '{count} páginas abaixo' },
    rootStudied: { one: '{studied} de {count} estudada', other: '{studied} de {count} estudadas' },
  },
  tools: {
    label: 'Visualização do mapa',
    zoomOut: 'Diminuir o zoom',
    zoomIn: 'Aumentar o zoom',
    fit: 'Ajustar o mapa à tela',
    fitAt: '{zoom}%, ajustar o mapa à tela',
    centreOn: 'Centralizar em {title}',
    legend: 'Legenda',
  },
  branch: {
    add: 'Adicionar uma página a {title}',
    dialog: 'Nova página em {title}',
    field: 'Nome da nova página',
    hint: 'Enter adiciona e abre · {mod}Enter adiciona e fica · Esc fecha',
    exists: '“{title}” já existe: Enter liga ela aqui',
    isThis: 'Essa é esta página',
    added: '“{title}” adicionada a “{parent}”',
    linked: '“{title}” ligada a “{parent}”',
    undo: 'Desfazer',
    listAdd: 'Nova página',
  },
  legend: {
    crossLink: 'Link entre páginas de ramos diferentes',
    keys: 'Entre no mapa com Tab; depois, as setas movem entre as páginas, Enter abre uma e N adiciona uma página saindo dela.',
  },
  list: {
    empty: 'Nada no mapa ainda. Adicione uma página abaixo, ou digite / no conteúdo de {title}.',
    orphans: 'Órfãs',
    orphansHeading: 'Órfãs · nenhum link chega a elas',
  },
  orphans: {
    count: { one: '{count} página fora do mapa', other: '{count} páginas fora do mapa' },
    hint: {
      one: 'Nenhum link chega a ela a partir de {title}. Ligue-a com [[Title]] em qualquer página da trilha.',
      other: 'Nenhum link chega a elas a partir de {title}. Ligue-as com [[Title]] em qualquer página da trilha.',
    },
  },
} as const satisfies Shape<typeof en>;
