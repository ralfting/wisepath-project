import { Extension } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import { Fragment } from '@tiptap/pm/model';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import type { EditorState, Transaction } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { EditorView } from '@tiptap/pm/view';
import { IconArticle, IconBrandYoutube, IconBulb, IconTool } from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import type { Translate } from '@/i18n/I18nProvider';
import { TEMPLATES, addressOf, nextEmptySection, sectionsIn, templateContent } from './templates';
import type { Block, Section, TemplateId } from './templates';
import classes from './PageTemplates.module.css';

/**
 * PageTemplates
 * Templates in the editor: on an empty page a quiet row offers them ("Start
 * with: Concept · Video · Article · Tool · Blank"), picked with a click or
 * ← → and Enter, and never applied on its own; under each template heading
 * whose section is empty, a grey hint that is not part of the text; and
 * ⌘↓ (Ctrl+↓) to the next empty section. The markdown only ever has the
 * headings and what the learner writes.
 */

/** What the empty page's row offers, in order: the templates, then a blank page */
const START = [...TEMPLATES.map((tpl) => tpl.id), 'blank'] as const;
type StartChoice = (typeof START)[number];

interface TemplateState {
  /** The row's choice marked from the keyboard, if any */
  pick: number | null;
  /** Blank was chosen: the row stays away until the page has text */
  dismissed: boolean;
  /** The line a template's video or article address is pasted in, while it is empty (only just after filling) */
  address: { pos: number; of: 'video' | 'article' } | null;
}

const templatesKey = new PluginKey<TemplateState>('pageTemplates');

/** The page's top-level blocks, as much as recognising sections needs */
function blocksOf(doc: ProseMirrorNode): Block[] {
  const blocks: Block[] = [];
  doc.forEach((node, pos) => {
    const name = node.type.name;
    blocks.push({
      kind: name === 'heading' ? 'heading' : name === 'paragraph' ? 'paragraph' : 'other',
      level: name === 'heading' ? (node.attrs.level as number) : undefined,
      text: node.textContent,
      // A video, a list or a table is something written, even without text
      empty: (name === 'paragraph' || name === 'codeBlock' || name === 'heading') && node.content.size === 0,
      pos,
    });
  });
  return blocks;
}

/** The page's template sections, by where their headings start */
export function templateSections(doc: ProseMirrorNode): Section[] {
  return sectionsIn(blocksOf(doc));
}

const isEmptyPage = (doc: ProseMirrorNode) =>
  doc.childCount === 1 && doc.firstChild?.type.name === 'paragraph' && doc.firstChild.content.size === 0;

/** Puts the cursor on the empty line under a section's heading, adding that line when the page has none there */
function cursorInto(tr: Transaction, section: Section): Transaction {
  if (section.line !== null) return tr.setSelection(TextSelection.create(tr.doc, section.line + 1));
  const heading = tr.doc.nodeAt(section.pos);
  if (!heading) return tr;
  const at = section.pos + heading.nodeSize;
  // An empty line is not saved in the markdown, so adding it changes nothing worth undoing
  tr.insert(at, tr.doc.type.schema.nodes.paragraph.create()).setMeta('addToHistory', false);
  return tr.setSelection(TextSelection.create(tr.doc, at + 1));
}

/**
 * Moves the cursor to an empty section: the first on the page, or the next after the cursor (going round).
 * False when every section has something in it, or the page has none
 */
export function goToEmptySection(editor: Editor, which: 'first' | 'next'): boolean {
  const { state, view } = editor;
  const sections = templateSections(state.doc);
  const target = which === 'first' ? sections.find((s) => s.empty) : nextEmptySection(sections, state.selection.from);
  if (!target) return false;
  view.dispatch(cursorInto(state.tr, target).scrollIntoView());
  // Through the editor's own focus, which waits a frame: a drawer opening around the text takes the focus first
  editor.commands.focus(null, { scrollIntoView: false });
  return true;
}

/**
 * Puts a template where the cursor is: in place of an empty line, else after the cursor's block. The cursor
 * goes to the line for the address (a video or an article), else to the first section
 */
export function applyTemplate(editor: Editor, id: TemplateId, t: Translate) {
  const { state, view } = editor;
  const { $from } = state.selection;
  const blockStart = $from.depth > 0 ? $from.before(1) : $from.pos;
  const block = state.doc.nodeAt(blockStart);
  const replace = $from.depth > 0 && block?.type.name === 'paragraph' && block.content.size === 0;
  const from = replace || !block ? blockStart : blockStart + block.nodeSize;
  const to = replace && block ? blockStart + block.nodeSize : from;
  const nodes = templateContent(id, t).map((json) => state.schema.nodeFromJSON(json));
  const tr = state.tr.replaceWith(from, to, Fragment.from(nodes));
  const address = addressOf(id);
  if (address) {
    tr.setSelection(TextSelection.create(tr.doc, from + 1)).setMeta(templatesKey, { address: { pos: from, of: address } });
  } else {
    const first = templateSections(tr.doc).find((s) => s.pos >= from && s.empty);
    if (first) cursorInto(tr, first);
  }
  view.dispatch(tr.scrollIntoView());
  view.focus();
}

const ICONS: Record<TemplateId, Icon> = { concept: IconBulb, video: IconBrandYoutube, article: IconArticle, tool: IconTool };

/** The / commands' icon for a template */
export const templateIcon = (id: TemplateId): Icon => ICONS[id];

/** The / commands that insert a template where the cursor is ("/template" lists them all) */
export function templateSlashCommands(t: Translate) {
  return TEMPLATES.map(({ id }) => {
    const name = t(`templates.names.${id}`);
    return {
      id: `template-${id}`,
      template: id,
      label: t('templates.slash.label', { name }),
      hint: t('templates.slash.hint'),
      keywords: `${t('templates.slash.keywords')} ${name}`,
      run: (editor: Editor) => applyTemplate(editor, id, t),
    };
  });
}

/** The empty page's row of templates; a new one is drawn whenever its text or the choice changes */
function startRow(t: Translate, pick: number | null, choose: (choice: StartChoice) => void): HTMLElement {
  const row = document.createElement('div');
  row.className = classes.start;
  row.setAttribute('contenteditable', 'false');
  row.setAttribute('role', 'group');
  row.setAttribute('aria-label', t('templates.start.label'));
  row.title = t('templates.start.help');
  const label = document.createElement('span');
  label.className = classes.startLabel;
  label.textContent = t('templates.start.label');
  row.append(label);
  START.forEach((choice, i) => {
    if (i > 0) {
      const dot = document.createElement('span');
      dot.className = classes.startDot;
      dot.setAttribute('aria-hidden', 'true');
      dot.textContent = '·';
      row.append(dot);
    }
    const button = document.createElement('button');
    button.type = 'button';
    // The keys stay in the text (← → and Enter pick), so the choices are not Tab stops of their own
    button.tabIndex = -1;
    button.className = classes.startChoice;
    button.textContent = t(`templates.names.${choice}`);
    if (pick === i) button.setAttribute('data-picked', '');
    // Pressed without taking the focus from the text
    button.addEventListener('mousedown', (event) => {
      event.preventDefault();
      choose(choice);
    });
    row.append(button);
  });
  // Says the choice the arrows land on, for screen readers
  const status = document.createElement('span');
  status.className = classes.status;
  status.setAttribute('aria-live', 'polite');
  status.textContent = pick === null ? '' : t(`templates.names.${START[pick]}`);
  row.append(status);
  return row;
}

/** A hint where a section has no line under its heading (as a page saved and opened again has): a click writes there */
function hintLine(text: string, onPick: () => void): HTMLElement {
  const line = document.createElement('div');
  line.className = classes.hintLine;
  line.setAttribute('contenteditable', 'false');
  line.setAttribute('aria-hidden', 'true');
  line.textContent = text;
  line.addEventListener('mousedown', (event) => {
    event.preventDefault();
    onPick();
  });
  return line;
}

interface PageTemplatesOptions {
  /** Read when drawing and filling, so headings and hints follow the language */
  t: () => Translate;
}

export const PageTemplates = Extension.create<PageTemplatesOptions>({
  name: 'pageTemplates',

  addOptions() {
    return { t: () => (key: string) => key };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-ArrowDown': () => goToEmptySection(this.editor, 'next'),
    };
  },

  addProseMirrorPlugins() {
    const editor = this.editor;
    const t = () => this.options.t();

    const rowShown = (state: EditorState) => {
      const plugin = templatesKey.getState(state);
      return !!plugin && !plugin.dismissed && editor.isEditable && isEmptyPage(state.doc);
    };
    const choose = (view: EditorView, choice: StartChoice) => {
      if (choice === 'blank') view.dispatch(view.state.tr.setMeta(templatesKey, { dismissed: true, pick: null }));
      else applyTemplate(editor, choice, t());
    };

    return [
      new Plugin<TemplateState>({
        key: templatesKey,
        state: {
          init: () => ({ pick: null, dismissed: false, address: null }),
          apply(tr, value, _old, state) {
            let next: TemplateState = { ...value, ...(tr.getMeta(templatesKey) as Partial<TemplateState> | undefined) };
            if (next.address && tr.docChanged && !tr.getMeta(templatesKey)) next.address = { ...next.address, pos: tr.mapping.map(next.address.pos) };
            // The address hint goes once something is pasted or written there
            const line = next.address ? state.doc.nodeAt(next.address.pos) : null;
            if (next.address && !(line?.type.name === 'paragraph' && line.content.size === 0)) next = { ...next, address: null };
            // Text on the page sends the row away; an empty page again brings it back
            if (!isEmptyPage(state.doc)) next = { ...next, pick: null, dismissed: false };
            return next;
          },
        },
        props: {
          attributes: { class: classes.page },
          handleKeyDown(view, event) {
            if (!rowShown(view.state) || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return false;
            const { pick } = templatesKey.getState(view.state)!;
            if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
              const step = event.key === 'ArrowRight' ? 1 : -1;
              const from = pick ?? (step > 0 ? -1 : 0);
              view.dispatch(view.state.tr.setMeta(templatesKey, { pick: (from + step + START.length) % START.length }));
              return true;
            }
            if (event.key === 'Enter' && pick !== null) {
              choose(view, START[pick]);
              return true;
            }
            return false;
          },
          decorations(state) {
            const say = t();
            const decorations: Decoration[] = [];
            if (rowShown(state)) {
              const { pick } = templatesKey.getState(state)!;
              const key = `start-${pick}-${say('templates.start.label')}-${say('templates.names.concept')}`;
              decorations.push(
                Decoration.widget(state.doc.content.size, (view) => startRow(say, pick, (choice) => choose(view, choice)), {
                  key,
                  side: 1,
                  ignoreSelection: true,
                  stopEvent: () => true,
                }),
              );
            }
            for (const section of templateSections(state.doc)) {
              if (!section.empty) continue;
              const hint = say(`templates.sections.${section.id}.hint`);
              if (section.line !== null) {
                const line = state.doc.nodeAt(section.line);
                if (line) decorations.push(Decoration.node(section.line, section.line + line.nodeSize, { class: classes.hint, 'data-hint': hint }));
              } else {
                const heading = state.doc.nodeAt(section.pos);
                if (!heading || !editor.isEditable) continue;
                decorations.push(
                  Decoration.widget(
                    section.pos + heading.nodeSize,
                    (view) =>
                      hintLine(hint, () => {
                        view.dispatch(cursorInto(view.state.tr, section));
                        view.focus();
                      }),
                    { key: `hint-${section.id}-${section.pos}-${hint}`, side: -1, ignoreSelection: true, stopEvent: () => true },
                  ),
                );
              }
            }
            const address = templatesKey.getState(state)?.address;
            const line = address ? state.doc.nodeAt(address.pos) : null;
            if (address && line) {
              decorations.push(
                Decoration.node(address.pos, address.pos + line.nodeSize, { class: classes.hint, 'data-hint': say(`templates.address.${address.of}`) }),
              );
            }
            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});
