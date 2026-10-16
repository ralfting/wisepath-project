import type { Shape } from '../../format';
import type { help as en } from '../en/help';

/** Mensagens da Ajuda (o que posso fazer aqui), em português do Brasil */
export const help = {
  open: 'Ajuda',
  title: 'O que posso fazer aqui',
  play: 'Ver o exemplo',
  page: {
    intro: 'Uma página é texto livre em markdown. Estas são as duas coisas que as pessoas procuram primeiro.',
    addPage: {
      title: 'Adicionar uma página',
      body: 'Digite / e escolha Página, dê um nome e aperte Enter: a página nova sai desta e abre. Ou escreva [[Nome]] no texto e clique nele.',
    },
    videoNotes: {
      title: 'Anotar um vídeo',
      body: 'Cole um link do YouTube numa linha sozinha. Enquanto ele toca, aperte Nota em… embaixo dele (ou N): o vídeo pausa e sua nota vai para baixo dele com o momento, como [01:25]. Clicar num tempo toca o vídeo dali.',
    },
    more: 'O ? na barra do editor lista o markdown que você pode usar.',
  },
  map: {
    intro: 'O mapa é desenhado a partir dos links entre as páginas, para fora da página principal da trilha.',
    tips: {
      add: 'Aponte para uma página (ou foque nela) e aperte + ou N para adicionar uma página saindo dela.',
      open: 'Clique numa página para abri-la ao lado do mapa; ⌘ Enter (Ctrl Enter) abre em tela cheia.',
      keys: 'Pelo teclado: → e ← seguem os ramos, ↑ e ↓ passam entre irmãs, Home volta ao centro.',
      search: '⌘K (Ctrl K) busca páginas nesta trilha; Lista mostra a mesma árvore como lista recuada.',
    },
  },
  home: {
    intro: 'Suas trilhas, agrupadas por projeto.',
    tips: {
      newPath: 'Nova trilha começa uma no projeto padrão; o + de um projeto começa uma nele.',
      projects: 'Novo projeto cria um grupo; o menu ⋯ dele renomeia ou exclui (as trilhas vão para o padrão).',
      move: 'Arraste uma trilha para outro projeto para movê-la, ou use Mover para no menu ⋯ dela.',
      kind: 'Um Estudo é anotação livre; uma Trilha guiada acompanha o que você estudou. Troque no menu ⋯ da trilha.',
    },
  },
} as const satisfies Shape<typeof en>;
