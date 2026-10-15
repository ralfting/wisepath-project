import type { Shape } from '../../format';
import type { capture as en } from '../en/capture';

/** Mensagens da captura da web (a janela do bookmarklet e sua configuração), em português do Brasil */
export const capture = {
  window: {
    meta: {
      title: 'Enviar ao WisePath',
    },
    heading: 'Enviar para a Caixa de entrada',
    page: 'A página',
    noTitle: 'Página sem título',
    at: 'em {time}',
    quote: 'Selecionado na página',
    note: 'Sua nota',
    notePlaceholder: 'Por que importa, o que fazer com isso… (opcional)',
    hint: 'Enter envia · Shift+Enter nova linha · Esc fecha',
    send: 'Enviar',
    loading: 'Abrindo o WisePath…',
    waiting: 'Sem conexão com o WisePath. Será enviado assim que possível.',
    saved: {
      title: 'Salvo na Caixa de entrada',
      body: 'Você já pode fechar esta janela.',
    },
    empty: {
      title: 'Nada para capturar',
      body: 'Abra esta janela pelo favorito Enviar ao WisePath, na página que quer guardar.',
      settings: 'Configurar o favorito',
    },
  },
  settings: {
    meta: {
      title: 'Capturar da web | WisePath',
    },
    crumb: 'Configurações',
    menu: 'Capturar da web',
    title: 'Capturar da web',
    intro: 'Guarde o que você lê e assiste em outros sites: um favorito envia a página aberta para a sua Caixa de entrada, com o texto selecionado.',
    steps: {
      label: 'Como configurar',
      bar: 'Mostre a barra de favoritos ({keys}).',
      drag: 'Arraste este botão para a barra de favoritos:',
      use: 'Em qualquer página, selecione o que importa (ou nada) e clique no favorito. Abre uma janela pequena com a página preenchida: escreva uma nota, se quiser, e tecle Enter.',
    },
    bookmarklet: 'Enviar ao WisePath',
    dragHint: 'Arraste para a barra de favoritos. Funciona em outros sites, não aqui.',
    video: 'No YouTube, guarda o momento em que o vídeo está. Arquivado numa página que tem o vídeo, vira uma nota embaixo dele, como {example}.',
    copy: {
      intro: 'Não consegue arrastar? Copie o endereço, crie um favorito à mão e cole como endereço dele.',
      button: 'Copiar o endereço',
      done: 'Copiado',
    },
    login: 'Sem sessão aberta, a janela pede o login primeiro e depois mostra a página preenchida.',
  },
} as const satisfies Shape<typeof en>;
