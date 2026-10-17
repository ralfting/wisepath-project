import type { Shape } from '../../format';
import type { help as en } from '../en/help';

/** Mensagens da Ajuda (o que posso fazer aqui), em português do Brasil; a marcação é a mesma do inglês */
export const help = {
  open: 'Ajuda',
  title: 'O que posso fazer aqui',
  tip: 'Dica',
  play: 'Ver o exemplo',
  enlarge: 'Ampliar',
  enlargeClip: 'Ampliar o exemplo: {title}',
  page: {
    intro: 'Uma página é texto livre em markdown, ligada ao resto da trilha.',
    addPage: {
      title: 'Adicionar uma página',
      steps: {
        a: 'Numa linha nova, digite `/`',
        b: 'Escolha **Página**',
        c: 'Digite o nome e aperte <kbd>Enter</kbd>: a página nova **abre**, ligada a esta',
      },
      tip: 'Ou escreva `[[Nome]]` no texto e clique nele. <kbd>⌘</kbd> <kbd>Enter</kbd> cria a página e **fica** aqui.',
    },
    videoNotes: {
      title: 'Anotar um vídeo',
      steps: {
        a: 'Clique no botão de **vídeo** da barra e cole um link do YouTube',
        b: 'Dê play no vídeo',
        c: 'Aperte **Nota em…** embaixo dele (ou <kbd>N</kbd>): o vídeo **pausa**',
        d: 'Escreva e aperte <kbd>Enter</kbd>: a nota guarda o momento, como `[01:25]`',
      },
      tip: 'Clique num tempo para tocar o vídeo **dali**.',
    },
  },
  map: {
    intro: 'O mapa é desenhado a partir dos links entre as páginas, para fora da página principal da trilha.',
    addBranch: {
      title: 'Adicionar uma página pelo mapa',
      steps: {
        a: 'Aponte para uma página (ou foque nela)',
        b: 'Clique no **+** dela (ou aperte <kbd>N</kbd>)',
        c: 'Dê nome à página nova e aperte <kbd>Enter</kbd>',
      },
      tip: 'A página nova **sai daquela** e abre ao lado do mapa.',
    },
    search: {
      title: 'Achar uma página nesta trilha',
      steps: {
        a: 'Aperte <kbd>⌘</kbd> <kbd>K</kbd> ou clique na **busca**',
        b: 'Digite: as páginas que batem **acendem** no mapa',
        c: '<kbd>Enter</kbd> abre a página marcada',
      },
      tip: '<kbd>↑</kbd> <kbd>↓</kbd> passam entre os resultados.',
    },
    open: {
      title: 'Abrir uma página',
      steps: {
        a: '**Clique** numa página: ela abre ao lado do mapa',
        b: '<kbd>⌘</kbd> <kbd>Enter</kbd> abre em **tela cheia**',
      },
      tip: '**Lista** mostra as mesmas páginas como lista recuada.',
    },
    keys: {
      title: 'Andar pelo teclado',
      steps: {
        a: '<kbd>→</kbd> <kbd>←</kbd> seguem os ramos',
        b: '<kbd>↑</kbd> <kbd>↓</kbd> passam entre páginas lado a lado',
        c: '<kbd>Home</kbd> volta ao centro',
        d: '<kbd>Enter</kbd> abre a página',
      },
      tip: 'Clique no mapa antes, ou chegue nele com <kbd>Tab</kbd>.',
    },
  },
  home: {
    intro: 'Suas trilhas, agrupadas por projeto.',
    newPath: {
      title: 'Começar uma trilha',
      steps: {
        a: 'Clique em **Nova trilha**',
        b: 'Escreva o que você está aprendendo e escolha o **projeto**',
        c: 'Escolha **Estudo** ou **Trilha guiada** e crie: o mapa abre',
      },
      tip: 'O **+** de um projeto começa uma trilha direto nele.',
    },
    projects: {
      title: 'Agrupar trilhas em projetos',
      steps: {
        a: 'Clique em **Novo projeto** e dê um nome',
        b: '**Arraste** uma trilha para ele (ou **⋯** › **Mover para**)',
        c: 'O menu **⋯** dele **renomeia** ou **exclui**',
      },
      tip: 'Excluir um projeto leva as trilhas dele para o **padrão**: nada se perde.',
    },
    kind: {
      title: 'Estudo ou trilha guiada',
      steps: {
        a: '**Estudo**: anotação livre, nada a terminar',
        b: '**Trilha guiada**: seguida página por página, acompanhando o que você estudou',
      },
      tip: 'Troque no menu **⋯** da trilha; o que você marcou como estudado **fica**.',
    },
  },
} as const satisfies Shape<typeof en>;
