import type { Shape } from '../../format';
import type { templates as en } from '../en/templates';

/** Mensagens dos modelos de página, em português do Brasil */
export const templates = {
  names: {
    concept: 'Conceito',
    video: 'Vídeo',
    article: 'Artigo',
    tool: 'Ferramenta',
    blank: 'Em branco',
  },
  start: {
    label: 'Começar com:',
    help: '← → para escolher, Enter para preencher a página',
  },
  slash: {
    label: 'Modelo: {name}',
    hint: 'As seções dele, aqui',
    keywords: 'modelo template seções',
  },
  outline: {
    empty: '{heading} (vazia)',
  },
  sections: {
    oneLine: { heading: 'Em uma linha', hint: 'O que é, em uma frase?' },
    why: { heading: 'Por que existe', hint: 'Que problema resolve? O que se fazia antes?' },
    how: { heading: 'Como funciona', hint: 'O mecanismo: o que acontece, passo a passo.' },
    notes: { heading: 'Notas', hint: 'Momentos do vídeo e o que é dito neles: [01:25] a ideia.' },
    passages: { heading: 'Trechos', hint: 'Cite os trechos que importam (comece a linha com >) e diga por quê.' },
    install: { heading: 'Instalação e uso', hint: 'Como instalar, e a primeira coisa a fazer com ela.' },
    example: { heading: 'Exemplo', hint: 'O menor caso real.' },
    practice: { heading: 'Prática', hint: 'Algo para fazer com isso, agora.' },
    pitfalls: { heading: 'Armadilhas', hint: 'O que dá errado, e como perceber.' },
    questions: { heading: 'Perguntas', hint: 'Pergunta :: Resposta, uma por linha, para revisar.' },
    sources: { heading: 'Fontes', hint: 'De onde veio: links, livros, pessoas.' },
  },
  address: {
    video: 'Cole aqui o endereço do vídeo.',
    article: 'Cole aqui o endereço do artigo.',
  },
} as const satisfies Shape<typeof en>;
