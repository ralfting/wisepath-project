import type { Shape } from '@/i18n/format';
import type { help as en } from '@/i18n/messages/en/help';

/** Mensagens da Ajuda (o que posso fazer aqui), em português do Brasil; a marcação é a mesma do inglês */
export const help = {
  open: 'Ajuda',
  title: 'O que posso fazer aqui',
  tip: 'Dica',
  play: 'Ver o exemplo',
  enlarge: 'Ampliar',
  enlargeClip: 'Ampliar o exemplo: {title}',
  page: {
    intro: 'Uma página guarda suas anotações, links e vídeos, ligada ao resto da trilha.',
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
    callout: {
      title: 'Destacar uma nota numa caixa',
      steps: {
        a: 'Numa linha nova, digite `/` e escolha **Destaque de informação**, **de atenção** ou **de perigo**',
        b: 'Ou digite `[!info]`, `[!warning]` ou `[!danger]` e um espaço',
        c: 'Escreva dentro da caixa; <kbd>Enter</kbd> numa linha vazia sai dela',
      },
      tip: 'Clique no **ícone** da caixa para mudar o tipo, ou para tirar a caixa e manter o texto.',
    },
    activity: {
      title: 'Pedir algo para fazer na página',
      steps: {
        a: 'Numa linha nova, digite `/` e escolha **Atividade**, ou digite `[!activity]` e um espaço',
        b: 'Escreva o que fazer dentro da caixa: uma linha, uma lista, uma pergunta para responder',
        c: 'Numa trilha guiada cada leitor marca **Marcar como feita**; a página conta como estudada quando as atividades estão feitas',
      },
      tip: 'Cada leitor marca as suas. Desmarcar uma numa página estudada desmarca a página; o mapa mostra uma prancheta nas páginas com atividades.',
    },
    cite: {
      title: 'Citar uma página sem colocá-la no mapa',
      steps: {
        a: 'Digite `@[[` e escolha a página, ou `/` e escolha **Citar uma página**',
        b: 'A citação aparece mais discreta que um link: esmaecida, pontilhada, com aspas',
        c: 'Para trocar um link por uma citação, aponte para ele e use o botão do cartão, ou ponha o cursor nele e aperte <kbd>⌘</kbd> <kbd>⇧</kbd> <kbd>L</kbd> (<kbd>Ctrl</kbd> <kbd>Shift</kbd> <kbd>L</kbd>)',
      },
      tip: 'Só links colocam páginas no mapa. Uma citação desenha uma linha cinza tracejada entre páginas que já estão nele, e uma página só citada fica com as páginas soltas.',
    },
    moveBranch: {
      title: 'Mudar uma página de ramo',
      steps: {
        a: 'Abra a aba **Relacionadas** da página',
        b: 'Ao lado de **Ramo de**, clique em **Mudar**',
        c: 'Escolha a página de onde ela deve sair e aperte <kbd>Enter</kbd>',
      },
      tip: 'O `[[link]]` muda sozinho: sai do texto da página antiga e vai para o fim da nova. Só aparecem as páginas onde a mudança vale.',
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
  inbox: {
    intro: 'Anote agora, organize depois: o que você captura espera aqui.',
    capture: {
      title: 'Capturar uma ideia',
      steps: {
        a: 'Clique em **Capturar**, ou aperte <kbd>⌘</kbd> <kbd>⇧</kbd> <kbd>Space</kbd> em qualquer lugar do WisePath',
        b: 'Escreva a ideia, o link ou a pergunta',
        c: 'Aperte <kbd>Enter</kbd>: fica esperando aqui, as mais novas primeiro',
      },
      tip: 'Um link colado guarda o **título**; um link do YouTube com tempo guarda o **momento**.',
    },
    file: {
      title: 'Adicionar a uma página',
      steps: {
        a: 'Clique em **Adicionar a…** num item',
        b: 'Escolha a **trilha** e depois a **página**',
        c: 'O item vai para o **fim** daquela página e sai da Caixa de entrada',
      },
      tip: 'Um momento de vídeo entra nas notas **embaixo daquele vídeo**, como `- [01:25]`.',
    },
    makePage: {
      title: 'Virar uma página',
      steps: {
        a: 'Clique em **Virar uma página** num item',
        b: 'Escolha a trilha e a página que vai ligar a ela',
        c: 'Uma página nova guarda o item, ligada àquela página',
      },
      tip: 'A página nova recebe o título do link, ou a primeira linha do item.',
    },
    fromPage: {
      title: 'Trazer de dentro de uma página',
      steps: {
        a: 'Numa página, digite `/` e escolha **Item da Caixa de entrada**',
        b: 'Escolha o item: ele entra onde está o cursor',
      },
      tip: 'Ele sai da Caixa de entrada quando a página é salva.',
    },
    keys: {
      title: 'Usar o teclado',
      steps: {
        a: '<kbd>↑</kbd> <kbd>↓</kbd> passam entre os itens',
        b: '<kbd>A</kbd> adiciona o item a uma página',
        c: '<kbd>D</kbd> exclui, com **Desfazer** por alguns segundos',
        d: '<kbd>Enter</kbd> abre de onde ele veio',
      },
      tip: 'Nas listas de escolha, <kbd>→</kbd> abre as páginas de uma trilha e <kbd>←</kbd> volta.',
    },
  },
  home: {
    intro: 'Suas trilhas, agrupadas por projeto.',
    newPath: {
      title: 'Começar uma trilha',
      steps: {
        a: 'Clique em **Nova trilha**',
        b: 'Escreva o que você está aprendendo e escolha o **projeto**. Ela começa como **Estudo**',
        c: 'Clique em **Criar trilha**: a página principal abre, pronta para escrever',
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
