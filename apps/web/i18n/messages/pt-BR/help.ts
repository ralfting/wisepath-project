import type { Shape } from '../../format';
import type { help as en } from '../en/help';

/** Mensagens da Ajuda (o que posso fazer aqui), em português do Brasil */
export const help = {
  open: 'Ajuda',
  title: 'O que posso fazer aqui',
  play: 'Ver o exemplo',
  enlarge: 'Ampliar',
  enlargeClip: 'Ampliar o exemplo: {title}',
  page: {
    intro: 'Uma página é texto livre em markdown, ligada ao resto da trilha.',
    addPage: {
      title: 'Adicionar uma página',
      body: 'Digite / numa linha nova e escolha Página, dê um nome e aperte Enter: a página nova sai desta e abre. Ou escreva [[Nome]] no texto e clique nele.',
    },
    videoNotes: {
      title: 'Anotar um vídeo',
      body: 'Adicione um vídeo do YouTube pelo botão de vídeo (ou cole o link numa linha sozinha). Enquanto ele toca, aperte Nota em… embaixo dele (ou N): o vídeo pausa e sua nota vai para baixo dele com o momento, como [01:25]. Clicar num tempo toca o vídeo dali.',
    },
  },
  map: {
    intro: 'O mapa é desenhado a partir dos links entre as páginas, para fora da página principal da trilha.',
    addBranch: {
      title: 'Adicionar uma página pelo mapa',
      body: 'Aponte para uma página (ou foque nela) e clique no + dela (ou aperte N), dê nome à página nova e aperte Enter: ela sai daquela página e abre ao lado do mapa.',
    },
    search: {
      title: 'Achar uma página nesta trilha',
      body: '⌘K (Ctrl K), ou o botão de busca, acha páginas pelo título ou pelo texto; elas acendem no mapa, e Enter abre a marcada.',
    },
    open: {
      title: 'Abrir uma página',
      body: 'Clique numa página para abri-la ao lado do mapa; ⌘ Enter (Ctrl Enter) abre em tela cheia. Lista mostra a mesma árvore como lista recuada.',
    },
    keys: {
      title: 'Andar pelo teclado',
      body: '→ e ← seguem os ramos como desenhados, ↑ e ↓ passam entre irmãs, Home volta ao centro, Enter abre uma página.',
    },
  },
  home: {
    intro: 'Suas trilhas, agrupadas por projeto.',
    newPath: {
      title: 'Começar uma trilha',
      body: 'Nova trilha pergunta o que você está aprendendo, em que projeto ela entra e o tipo; o mapa abre, pronto para escrever. O + de um projeto começa uma nele.',
    },
    projects: {
      title: 'Agrupar trilhas em projetos',
      body: 'Novo projeto cria um grupo. Arraste uma trilha para ele para movê-la, ou use Mover para no menu ⋯ dela. O menu ⋯ de um projeto renomeia ou exclui; as trilhas dele vão para o projeto padrão.',
    },
    kind: {
      title: 'Estudo ou trilha guiada',
      body: 'Um Estudo é anotação livre, sem nada a terminar. Uma Trilha guiada é seguida página por página e acompanha o que você estudou. Troque no menu ⋯ da trilha; as marcas de estudado ficam.',
    },
  },
} as const satisfies Shape<typeof en>;
