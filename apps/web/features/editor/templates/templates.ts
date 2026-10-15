import type { JSONContent } from '@tiptap/react';
import type { Translate } from '@/i18n/I18nProvider';
import { templates as enTemplates } from '@/i18n/messages/en/templates';
import { templates as ptBRTemplates } from '@/i18n/messages/pt-BR/templates';

/**
 * Page templates
 * A template lays a page out in the order a subject is best understood, from
 * the concept to the practice. Each one is data: its sections, in order, and
 * what some of them start with (the line for the video's address, a code block
 * for the setup). It is written in the language it is filled in; what the
 * learner writes afterwards is theirs, and only the headings are saved.
 */

export type TemplateId = 'concept' | 'video' | 'article' | 'tool';
export type SectionId = keyof typeof enTemplates.sections;

/** A line of a template: a section's heading, the line its address is pasted in, or a code block to fill */
type Part = { kind: 'section'; id: SectionId } | { kind: 'address'; of: 'video' | 'article' } | { kind: 'code'; language: string };

const section = (id: SectionId): Part => ({ kind: 'section', id });

/** The same order for all; the middle fits the kind of page */
const middle = (how: SectionId, extra: Part[] = []): Part[] => [
  section('oneLine'),
  section('why'),
  section(how),
  ...extra,
  section('example'),
  section('practice'),
  section('pitfalls'),
  section('questions'),
  section('sources'),
];

export const TEMPLATES: ReadonlyArray<{ id: TemplateId; parts: ReadonlyArray<Part> }> = [
  { id: 'concept', parts: middle('how') },
  { id: 'video', parts: [{ kind: 'address', of: 'video' }, ...middle('notes')] },
  { id: 'article', parts: [{ kind: 'address', of: 'article' }, ...middle('passages')] },
  { id: 'tool', parts: middle('install', [{ kind: 'code', language: 'sh' }]) },
];

/** Section headings are ## in the page */
export const SECTION_LEVEL = 2;

const partsOf = (id: TemplateId) => TEMPLATES.find((tpl) => tpl.id === id)?.parts ?? [];

/** The markdown a template saves as: its headings (and its code block); empty lines are not kept */
export function templateMarkdown(id: TemplateId, t: Translate): string {
  return partsOf(id)
    .flatMap((part) =>
      part.kind === 'section'
        ? [`${'#'.repeat(SECTION_LEVEL)} ${t(`templates.sections.${part.id}.heading`)}`]
        : part.kind === 'code'
          ? ['```' + part.language + '\n```']
          : [],
    )
    .join('\n\n');
}

/**
 * The template as editor content: each heading with an empty line under it to write in (where its hint shows),
 * the address line first for a video or an article
 */
export function templateContent(id: TemplateId, t: Translate): JSONContent[] {
  return partsOf(id).flatMap((part): JSONContent[] =>
    part.kind === 'section'
      ? [
          { type: 'heading', attrs: { level: SECTION_LEVEL }, content: [{ type: 'text', text: t(`templates.sections.${part.id}.heading`) }] },
          { type: 'paragraph' },
        ]
      : part.kind === 'code'
        ? [{ type: 'codeBlock', attrs: { language: part.language } }]
        : [{ type: 'paragraph' }],
  );
}

/** Whether the template starts with a line for its source's address, and which */
export function addressOf(id: TemplateId): 'video' | 'article' | null {
  const first = partsOf(id)[0];
  return first?.kind === 'address' ? first.of : null;
}

/* ---------- Recognising sections ---------- */

const normalise = (text: string) => text.trim().replace(/[:：]$/, '').trim().toLocaleLowerCase();

/** Every section's heading, in every language, so a page keeps its hints after a language switch */
const HEADINGS = new Map<string, SectionId>(
  [enTemplates, ptBRTemplates].flatMap((messages) =>
    (Object.keys(messages.sections) as SectionId[]).map((id) => [normalise(messages.sections[id].heading), id] as const),
  ),
);

/** The template section a heading starts, in either language, or null for any other heading */
export function sectionOf(heading: string): SectionId | null {
  return HEADINGS.get(normalise(heading)) ?? null;
}

/** A top-level block of the page, as much as recognising sections needs */
export interface Block {
  kind: 'heading' | 'paragraph' | 'other';
  /** For a heading */
  level?: number;
  text: string;
  /** Nothing written in it: an empty line, or an empty code block */
  empty: boolean;
  pos: number;
}

export interface Section {
  id: SectionId;
  /** Where its heading starts */
  pos: number;
  /** Nothing written under the heading yet */
  empty: boolean;
  /** The empty line right under the heading, where the cursor goes, if there is one */
  line: number | null;
}

/**
 * The page's template sections, in order. A section runs from its heading to
 * the next heading of the same level or higher; it is empty while everything
 * in it is (empty lines, an empty code block)
 */
export function sectionsIn(blocks: ReadonlyArray<Block>): Section[] {
  const found: Section[] = [];
  blocks.forEach((block, i) => {
    const id = block.kind === 'heading' ? sectionOf(block.text) : null;
    if (!id) return;
    let empty = true;
    for (let j = i + 1; j < blocks.length; j++) {
      const next = blocks[j];
      if (next.kind === 'heading' && (next.level ?? 1) <= (block.level ?? 1)) break;
      if (next.kind === 'heading' || !next.empty) {
        empty = false;
        break;
      }
    }
    const after = blocks[i + 1];
    found.push({ id, pos: block.pos, empty, line: after?.kind === 'paragraph' && after.empty ? after.pos : null });
  });
  return found;
}

/** The next empty section after this position, going round to the first; null when none is empty */
export function nextEmptySection(sections: ReadonlyArray<Section>, from: number): Section | null {
  const empty = sections.filter((s) => s.empty);
  return empty.find((s) => s.pos > from) ?? empty[0] ?? null;
}
