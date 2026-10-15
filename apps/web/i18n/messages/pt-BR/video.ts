import type { Shape } from '../../format';
import type { video as en } from '../en/video';

/** Mensagens da área video, em português do Brasil */
export const video = {
  stage: {
    label: 'Vídeo. Espaço ou K reproduz e pausa, as setas pulam 5 segundos, M tira o som, F abre em tela cheia, N cria uma nota',
    iframeTitle: 'Vídeo do YouTube',
  },
  note: {
    at: 'Nota em {time}',
    tooltip: 'Pausar e escrever uma nota',
    placeholder: 'O que acontece aqui?',
    hint: 'Enter adiciona e o vídeo continua · Esc cancela',
    key: 'nota',
  },
  floating: {
    drag: 'Arraste para outro canto',
    back: 'Voltar ao vídeo',
    stop: 'Parar de flutuar o vídeo',
  },
  fullscreen: {
    enter: 'Tela cheia, com as notas',
    exit: 'Sair da tela cheia',
    notes: 'Notas deste vídeo',
    hideNotes: 'Ocultar notas',
    showNotes: 'Mostrar notas',
    empty: 'Nenhuma nota ainda. Adicione uma a qualquer momento: o vídeo espera enquanto você escreve.',
  },
  failed: 'Notas do vídeo indisponíveis: o YouTube não carregou.',
  timestamp: {
    play: 'Reproduzir o vídeo a partir de {time}',
    title: 'Reproduzir a partir de {time} (⌘↵ nesta linha)',
  },
} as const satisfies Shape<typeof en>;
