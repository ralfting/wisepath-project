import type { Shape } from '@/i18n/format';
import type { inbox as en } from '@/i18n/messages/en/inbox';

/** Mensagens da Caixa de entrada e da captura rápida, em português do Brasil */
export const inbox = {
  meta: {
    title: 'Caixa de entrada | WisePath',
  },
  title: 'Caixa de entrada',
  intro: 'O que você capturou, esperando para ir para uma página.',
  sidebar: {
    link: 'Caixa de entrada',
    waiting: { zero: 'Caixa de entrada, nada esperando', one: 'Caixa de entrada, {count} item esperando', other: 'Caixa de entrada, {count} itens esperando' },
  },
  capture: {
    label: 'Capturar',
    field: 'O que você quer guardar?',
    placeholder: 'Uma ideia, um link, uma pergunta… anote agora, organize depois',
    hint: 'Enter salva · Shift+Enter nova linha · Esc fecha',
    hintOnPage: 'Enter salva · {keys} adiciona a esta página · Esc fecha',
    destination: 'Para onde vai',
    toInbox: 'Caixa de entrada',
    toPage: 'Adicionar a “{title}”',
    link: {
      loading: 'Lendo o link…',
      at: 'em {time}',
      remove: 'Guardar sem o link',
    },
    saved: 'Salvo na Caixa de entrada',
    added: 'Adicionado a “{title}”',
  },
  list: {
    label: 'Esperando na Caixa de entrada',
    keys: '↑ ↓ mover · A adicionar a uma página · D excluir · Enter abrir a origem',
    loading: 'Carregando a Caixa de entrada…',
  },
  empty: {
    title: 'Nada esperando',
    body: 'Pressione {keys} em qualquer lugar do WisePath para anotar algo. Fica aqui até você adicionar a uma página.',
  },
  item: {
    label: '{text}, {time}',
    written: 'Escrito no WisePath',
    videoAt: 'em {time}',
    file: 'Adicionar a…',
    makePage: 'Virar uma página',
    delete: 'Excluir',
    openSource: 'Abrir {site}',
  },
  picker: {
    fileTitle: 'Adicionar a…',
    makeTitle: 'Virar uma página ligada a…',
    paths: 'Trilhas',
    pages: 'Páginas em {path}',
    findPath: 'Buscar uma trilha',
    findPage: 'Buscar uma página',
    back: 'Voltar às trilhas',
    current: 'Atual',
    loading: 'Abrindo a trilha…',
    noPaths: 'Nenhuma trilha encontrada.',
    noPages: 'Nenhuma página encontrada.',
    keys: '↑ ↓ escolher · → abrir trilha · Enter selecionar · ← voltar · Esc fecha',
  },
  done: {
    filed: 'Adicionado a “{title}”',
    made: 'Página “{title}” criada',
    deleted: 'Excluído da Caixa de entrada',
    undo: 'Desfazer',
    open: 'Abrir',
  },
  makePage: {
    untitled: 'Da Caixa de entrada',
  },
  errors: {
    pathGone: 'Essa trilha não existe mais. Escolha outra.',
    pageGone: 'Essa página não existe mais. Escolha outra.',
    notFiled: 'Não deu para adicionar à página, então continua na Caixa de entrada.',
    readOnly: 'Você só pode ler essa trilha, então continua na Caixa de entrada.',
    unavailable: 'Não foi possível acessar a Caixa de entrada agora. Tente de novo em instantes.',
  },
} as const satisfies Shape<typeof en>;
