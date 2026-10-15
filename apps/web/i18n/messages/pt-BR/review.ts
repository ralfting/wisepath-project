import type { Shape } from '../../format';
import type { review as en } from '../en/review';

/** Mensagens da revisão espaçada (a página Revisar e suas contagens), em português do Brasil */
export const review = {
  editor: {
    pending: 'Os cartões entram na revisão quando esta página for marcada como estudada',
  },
  meta: {
    title: 'Revisar | WisePath',
  },
  nav: {
    label: 'Revisar',
    due: { one: '{count} cartão para hoje', other: '{count} cartões para hoje' },
  },
  title: 'Revisar',
  titleIn: 'Revisar {path}',
  filter: {
    label: 'Cartões de',
    all: 'Todas as trilhas',
  },
  loading: 'Carregando cartões…',
  unavailable: 'Não foi possível acessar o WisePath agora. Recarregue a página para tentar de novo.',
  left: { one: 'Falta {count} cartão', other: 'Faltam {count} cartões' },
  from: 'De {page} · {path}',
  fromLabel: 'Abrir {page}, onde este cartão foi escrito',
  question: 'Pergunta',
  answer: 'Resposta',
  blank: 'lacuna',
  show: 'Mostrar a resposta',
  grade: {
    label: 'Quão bem você lembrou?',
    again: 'De novo',
    hard: 'Difícil',
    good: 'Bom',
    easy: 'Fácil',
    full: '{grade}, tecla {key}, volta em {when}',
  },
  done: {
    title: 'Pronto por hoje',
    body: { one: 'Você revisou {count} cartão. Volte amanhã para mais.', other: 'Você revisou {count} cartões. Volte amanhã para mais.' },
    back: 'Ir para Minhas trilhas',
  },
  empty: {
    title: 'Nada para revisar hoje',
    body: 'Os cartões vêm das suas notas. Em qualquer página, escreva uma pergunta e a resposta na mesma linha, ou marque palavras para esconder numa frase:',
    noCards: 'Esta trilha ainda não tem cartões. Escreva uma pergunta e a resposta na mesma linha em qualquer página dela:',
    exampleCard: 'O que uma closure guarda? :: As variáveis em volta dela',
    exampleCloze: 'Uma closure guarda as ==variáveis== em volta dela.',
  },
  path: {
    cards: { one: '{count} cartão', other: '{count} cartões' },
    due: { zero: 'nenhum para hoje', one: '{count} para hoje', other: '{count} para hoje' },
    review: 'Revisar',
    reviewLabel: 'Revisar {path}: {due}',
  },
  errors: {
    notSaved: 'Uma avaliação não foi salva. Verifique a conexão; o cartão vai voltar.',
  },
} as const satisfies Shape<typeof en>;
