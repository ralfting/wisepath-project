import { PathId } from './Path';
import type { Path } from './Path';
import { pathFrom } from './sample';
import type { Seed } from './sample';

/**
 * The sample path offered on a first visit (docs/plans/16-first-steps.md): reading literature, a subject anyone can
 * follow, in the learner's language. Its title says it is a sample, as PRODUCT.md asks of demo content. It is a
 * learning path, so it shows progress and the way on; nothing in it starts studied.
 */

const en: Seed = {
  title: 'Literature (sample)',
  text: 'A sample path: how to read a book closely, the main genres, and how to talk about what you read. Open a page, mark it studied, and the map shows how far you are.\n\nPages connect through links like [[Reading closely]]: write one with two square brackets.',
  module: { color: 'violet', icon: 'book' },
  next: [
    {
      title: 'Reading closely',
      text: 'Slow down on the passages that surprise you. Ask what the text says, how it says it, and why it says it that way.',
      module: { color: 'teal', icon: 'school' },
      next: [
        { title: 'Narrator and point of view', text: 'Who tells the story, and how much do they know? A first-person narrator can be wrong, or lie.' },
        { title: 'Character', text: 'What a character wants, what stands in the way, and how they change, or refuse to.' },
        { title: 'Theme', text: 'The ideas a book keeps returning to. A theme is a question the book asks, more than an answer it gives.' },
      ],
    },
    {
      title: 'Genres',
      text: 'Genres are habits a reader recognises: what to expect, and what a book does with that expectation.',
      module: { color: 'blue', icon: 'layers' },
      next: [
        { title: 'The novel', text: 'Long prose fiction, room for many characters and the time to watch them change. Compare it with [[The short story]].' },
        { title: 'The short story', text: 'One situation, few characters, an ending that changes how you read the beginning.' },
        { title: 'Poetry', text: 'Language where sound, line and image carry as much as meaning. Read it aloud, at least once.' },
        { title: 'Drama', text: 'Written to be performed: dialogue and action, with the stage as part of the meaning.' },
      ],
    },
    {
      title: 'Writing about books',
      text: 'Writing a few lines after reading fixes what you understood, and shows what you missed.',
      module: { color: 'orange', icon: 'route' },
      next: [
        { title: 'A reading journal', text: 'After each session: one passage you marked, one question, one connection to something else you read.' },
        { title: 'A short review', text: 'What the book tries to do, how well it does it, and who you would give it to. Use [[Theme]] and [[Character]].' },
      ],
    },
  ],
};

const ptBR: Seed = {
  title: 'Literatura (exemplo)',
  text: 'Uma trilha de exemplo: como ler um livro com atenção, os principais gêneros e como falar do que você leu. Abra uma página, marque como estudada, e o mapa mostra quanto você já avançou.\n\nAs páginas se ligam por links como [[Leitura atenta]]: escreva um com dois colchetes.',
  module: { color: 'violet', icon: 'book' },
  next: [
    {
      title: 'Leitura atenta',
      text: 'Vá devagar nos trechos que surpreendem. Pergunte o que o texto diz, como diz e por que diz desse jeito.',
      module: { color: 'teal', icon: 'school' },
      next: [
        { title: 'Narrador e ponto de vista', text: 'Quem conta a história, e quanto sabe? Um narrador em primeira pessoa pode se enganar, ou mentir.' },
        { title: 'Personagem', text: 'O que a personagem quer, o que a impede e como ela muda, ou se recusa a mudar.' },
        { title: 'Tema', text: 'As ideias a que o livro sempre volta. Um tema é mais uma pergunta que o livro faz do que uma resposta que ele dá.' },
      ],
    },
    {
      title: 'Gêneros',
      text: 'Gêneros são hábitos que o leitor reconhece: o que esperar, e o que o livro faz com essa expectativa.',
      module: { color: 'blue', icon: 'layers' },
      next: [
        { title: 'O romance', text: 'Prosa de ficção longa, com espaço para muitas personagens e tempo para vê-las mudar. Compare com [[O conto]].' },
        { title: 'O conto', text: 'Uma situação, poucas personagens, um final que muda a leitura do começo.' },
        { title: 'Poesia', text: 'Linguagem em que som, verso e imagem pesam tanto quanto o sentido. Leia em voz alta, pelo menos uma vez.' },
        { title: 'Teatro', text: 'Escrito para ser encenado: diálogo e ação, com o palco como parte do sentido.' },
      ],
    },
    {
      title: 'Escrever sobre livros',
      text: 'Escrever algumas linhas depois de ler fixa o que você entendeu, e mostra o que passou despercebido.',
      module: { color: 'orange', icon: 'route' },
      next: [
        { title: 'Um diário de leitura', text: 'Depois de cada leitura: um trecho que você marcou, uma pergunta, uma ligação com outra coisa que você leu.' },
        { title: 'Uma resenha curta', text: 'O que o livro tenta fazer, se consegue, e para quem você o daria. Use [[Tema]] e [[Personagem]].' },
      ],
    },
  ],
};

/** The sample path in the learner's language; a copy with fresh ids becomes theirs (copyPath) */
export function literatureSample(locale: 'en' | 'pt-BR'): Path {
  const seed = locale === 'pt-BR' ? ptBR : en;
  const description =
    locale === 'pt-BR' ? 'Exemplo: ler literatura com atenção, página por página.' : 'Sample: reading literature closely, page by page.';
  return pathFrom(seed, { id: PathId.make('literature-sample'), description, kind: 'learningPath' });
}
