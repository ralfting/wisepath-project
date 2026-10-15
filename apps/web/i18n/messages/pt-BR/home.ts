import type { Shape } from '../../format';
import type { home as en } from '../en/home';

/** Mensagens da área home (a lista de trilhas, o tipo de uma trilha, o salvamento), em português do Brasil */
export const home = {
  meta: {
    projects: 'Minhas trilhas | WisePath',
    path: 'Trilha | WisePath',
  },
  title: 'Minhas trilhas',
  intro: 'Cada trilha é um assunto que você está aprendendo, página por página, ligado pelos links que você escreve.',
  search: 'Buscar trilhas',
  newPath: 'Nova trilha',
  empty: 'Nenhuma trilha ainda. Comece uma em Nova trilha.',
  noMatch: 'Nenhuma trilha corresponde a “{query}”.',
  card: {
    pages: { one: '{count} página', other: '{count} páginas' },
    modules: { one: '{count} módulo', other: '{count} módulos' },
    orphans: { one: '{count} página órfã', other: '{count} páginas órfãs' },
    more: 'Mais opções para {title}',
    progress: 'Progresso em {title}',
    studied: { one: '{studied} de {count} página estudada', other: '{studied} de {count} páginas estudadas' },
    next: 'Próxima: {title}',
    open: 'Abrir trilha',
    start: 'Começar a estudar',
    continue: 'Continuar estudando',
    delete: 'Excluir trilha',
  },
  create: {
    title: 'Nova trilha',
    name: 'O que você está aprendendo?',
    nameHint: 'A página principal da trilha recebe esse nome. Adicione páginas digitando / e escolhendo Página.',
    namePlaceholder: 'Rust, Álgebra linear, Japonês…',
    nameRequired: 'Dê um nome à trilha',
    kind: 'Que tipo de trilha?',
    kindHint: 'Dá para mudar depois, no menu da trilha.',
    submit: 'Criar trilha',
  },
  delete: {
    title: 'Excluir trilha?',
    body: {
      one: 'e sua página serão excluídas, junto com o que você marcou como estudado. Não dá para desfazer.',
      other: 'e suas {count} páginas serão excluídas, junto com o que você marcou como estudado. Não dá para desfazer.',
    },
    keep: 'Manter',
    confirm: 'Excluir trilha',
  },
  kind: {
    study: {
      label: 'Estudo',
      hint: 'Crie e organize páginas livremente. Sem progresso para acompanhar.',
      switchTo: 'Transformar em estudo',
    },
    learningPath: {
      label: 'Trilha guiada',
      hint: 'Siga página por página, marcando o que você estudou.',
      switchTo: 'Transformar em trilha guiada',
    },
  },
  save: {
    saving: 'Salvando…',
    saved: 'Salvo',
    offline: 'Sem conexão · tentando de novo',
    offlineHint: 'Suas alterações ficam guardadas aqui e serão salvas assim que o WisePath responder.',
    undone: 'Alteração desfeita',
    /** Por que a API recusou uma alteração (useCases/projects/sync.ts) */
    notice: {
      titleTaken: 'Outra página já tem esse título, então a alteração foi desfeita.',
      pageDeleted: 'Essa página foi excluída em outro lugar, então a alteração foi desfeita.',
      rootProtected: 'A página principal da trilha não pode ser alterada desse jeito.',
      notSaved: 'Uma alteração não pôde ser salva e foi desfeita.',
    },
  },
  gate: {
    title: 'Não foi possível abrir esta trilha',
    body: 'Não foi possível falar com o WisePath agora. Recarregue a página para tentar de novo.',
  },
  notFound: {
    title: 'Trilha não encontrada',
    body: 'Esta trilha não existe ou o link está errado. Suas trilhas estão em Minhas trilhas.',
    back: 'Ir para Minhas trilhas',
  },
  errors: {
    pathGone: 'Esta trilha não existe mais.',
  },
} as const satisfies Shape<typeof en>;
