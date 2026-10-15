import { describe, expect, it } from 'vitest';
import { translate } from '@/i18n/format';
import type { Locale } from '@/i18n/locales';
import type { Translate } from '@/i18n/I18nProvider';
import { en } from '@/i18n/messages/en';
import { ptBR } from '@/i18n/messages/pt-BR';
import { nextEmptySection, sectionOf, sectionsIn, templateContent, templateMarkdown } from './templates';
import type { Block } from './templates';

const tIn = (locale: Locale): Translate => (key, values) => translate(locale === 'en' ? en : ptBR, en, locale, key, values);

describe('templates', () => {
  it('writes a concept as its eight headings, in order', () => {
    expect(templateMarkdown('concept', tIn('en'))).toBe(
      [
        '## In one line',
        '## Why it exists',
        '## How it works',
        '## Example',
        '## Practice',
        '## Pitfalls',
        '## Questions',
        '## Sources',
      ].join('\n\n'),
    );
  });

  it('writes the same order in Portuguese', () => {
    expect(templateMarkdown('concept', tIn('pt-BR'))).toBe(
      ['Em uma linha', 'Por que existe', 'Como funciona', 'Exemplo', 'Prática', 'Armadilhas', 'Perguntas', 'Fontes'].map((h) => `## ${h}`).join('\n\n'),
    );
  });

  it('fits the middle to the kind of page', () => {
    expect(templateMarkdown('video', tIn('en'))).toContain('## Why it exists\n\n## Notes\n\n## Example');
    expect(templateMarkdown('article', tIn('pt-BR'))).toContain('## Por que existe\n\n## Trechos\n\n## Exemplo');
    expect(templateMarkdown('tool', tIn('en'))).toContain('## Install and use\n\n```sh\n```\n\n## Example');
    expect(templateMarkdown('tool', tIn('pt-BR'))).toContain('## Instalação e uso\n\n```sh\n```\n\n## Exemplo');
  });

  it("saves nothing for the address line: it is a place to paste, not text", () => {
    expect(templateMarkdown('video', tIn('en')).startsWith('## In one line')).toBe(true);
    const content = templateContent('video', tIn('en'));
    expect(content[0]).toEqual({ type: 'paragraph' });
    expect(content[1]).toMatchObject({ type: 'heading', content: [{ text: 'In one line' }] });
    // Every heading has a line under it to write in
    expect(content.filter((c) => c.type === 'heading')).toHaveLength(8);
    expect(content.filter((c) => c.type === 'paragraph')).toHaveLength(9);
  });
});

const heading = (text: string, pos: number, level = 2): Block => ({ kind: 'heading', level, text, empty: !text, pos });
const line = (text: string, pos: number): Block => ({ kind: 'paragraph', text, empty: !text, pos });
const code = (text: string, pos: number): Block => ({ kind: 'other', text, empty: !text, pos });

describe('recognising sections', () => {
  it('knows the headings in either language, whatever the case or a trailing colon', () => {
    expect(sectionOf('Why it exists')).toBe('why');
    expect(sectionOf('por que existe')).toBe('why');
    expect(sectionOf(' Pitfalls: ')).toBe('pitfalls');
    expect(sectionOf('Instalação e uso')).toBe('install');
    expect(sectionOf('My own heading')).toBeNull();
  });

  it('finds empty and written sections, by what is under each heading', () => {
    const sections = sectionsIn([
      heading('In one line', 0),
      line('A sentence', 10),
      heading('Why it exists', 20),
      line('', 30),
      heading('How it works', 40),
      heading('Some detail', 50, 3),
      line('Written', 60),
      heading('Install and use', 70),
      code('', 80),
      heading('My own heading', 90),
      heading('Sources', 100),
    ]);
    expect(sections.map((s) => [s.id, s.empty, s.line])).toEqual([
      ['oneLine', false, null],
      ['why', true, 30],
      // A subheading under it is writing in it
      ['how', false, null],
      // An empty code block is not
      ['install', true, null],
      ['sources', true, null],
    ]);
  });

  it('moves to the next empty section, going round to the first', () => {
    const sections = sectionsIn([heading('In one line', 0), heading('Why it exists', 10), line('Written', 20), heading('Example', 30), heading('Sources', 40)]);
    expect(nextEmptySection(sections, 0)?.id).toBe('example');
    expect(nextEmptySection(sections, 31)?.id).toBe('sources');
    expect(nextEmptySection(sections, 41)?.id).toBe('oneLine');
    expect(nextEmptySection(sectionsIn([heading('Example', 0), line('Done', 10)]), 0)).toBeNull();
  });
});
