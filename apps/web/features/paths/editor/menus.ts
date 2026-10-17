import { Extension } from '@tiptap/react';
import type { Editor, Range } from '@tiptap/react';
import Suggestion from '@tiptap/suggestion';
import type { SuggestionKeyDownProps, SuggestionProps } from '@tiptap/suggestion';
import { PluginKey } from '@tiptap/pm/state';

/** The editor's popup menus: the [[ page picker and the / commands */

export interface MenuState<Item> {
  items: Item[];
  index: number;
  rect: DOMRect | null;
  select: (item: Item) => void;
}

interface MenuOptions<Item> {
  editor: Editor;
  key: string;
  /** What opens the menu, typed after a space or at the start of a line */
  char: string;
  allowSpaces: boolean;
  getItems: (query: string) => Item[];
  /** Runs the chosen item over the text typed since the trigger */
  choose: (editor: Editor, range: Range, item: Item) => void;
  /** Receives menu state for the React popup; null hides it */
  onState: (state: MenuState<Item> | null) => void;
}

/** A suggestion menu driven from the keyboard: arrows move, Enter or Tab picks, Esc closes */
function suggestionMenu<Item>({ editor, key, char, allowSpaces, getItems, choose, onState }: MenuOptions<Item>) {
  let current: MenuState<Item> | null = null;

  // While the menu is open, Esc closes it, not a drawer around the editor (Mantine skips Esc from such elements)
  const holdEscape = (held: boolean) => {
    if (held) editor.view.dom.setAttribute('data-mantine-stop-propagation', 'true');
    else editor.view.dom.removeAttribute('data-mantine-stop-propagation');
  };

  const publish = (props: SuggestionProps<Item>) => {
    holdEscape(true);
    current = {
      items: props.items,
      index: 0,
      rect: props.clientRect?.() ?? null,
      select: (item) => choose(props.editor, props.range, item),
    };
    onState(current);
  };

  return Suggestion<Item>({
    editor,
    pluginKey: new PluginKey(key),
    char,
    allowSpaces,
    items: ({ query }) => getItems(query),
    render: () => ({
      onStart: publish,
      onUpdate: publish,
      onKeyDown: ({ event }: SuggestionKeyDownProps) => {
        if (!current) return false;
        const count = current.items.length;
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          if (!count) return false;
          const step = event.key === 'ArrowDown' ? 1 : -1;
          current = { ...current, index: (current.index + step + count) % count };
          onState(current);
          return true;
        }
        if (event.key === 'Enter' || event.key === 'Tab') {
          const item = current.items[current.index];
          if (!item) return false;
          current.select(item);
          return true;
        }
        if (event.key === 'Escape') {
          // Mantine has already seen this Esc (it listens first); the next one may close the drawer again
          holdEscape(false);
          current = null;
          onState(null);
          return true;
        }
        return false;
      },
      onExit: () => {
        holdEscape(false);
        current = null;
        onState(null);
      },
    }),
  });
}

export interface PageLinkItem {
  /** Page id, or null for a page that does not exist yet */
  id: string | null;
  title: string;
}

export type PageLinkPickerState = MenuState<PageLinkItem>;

interface PageLinkOptions {
  getItems: (query: string) => PageLinkItem[];
  onLink: (item: PageLinkItem) => void;
  onState: (state: PageLinkPickerState | null) => void;
}

/** Typing [[ opens a picker of the path's pages; choosing one inserts a [[Page]] link */
export const PageLinkSuggestion = Extension.create<PageLinkOptions>({
  name: 'pageLinkSuggestion',

  addOptions() {
    return { getItems: () => [], onLink: () => {}, onState: () => {} };
  },

  addProseMirrorPlugins() {
    const { getItems, onLink, onState } = this.options;
    return [
      suggestionMenu<PageLinkItem>({
        editor: this.editor,
        key: this.name,
        char: '[[',
        allowSpaces: true,
        getItems,
        choose: (editor, range, item) => {
          editor.chain().focus().deleteRange(range).run();
          insertPageLink(editor, editor.state.selection.from, item.title);
          onLink(item);
        },
        onState,
      }),
    ];
  },
});

/** Puts a [[Title]] link and a space at a position in the text */
export function insertPageLink(editor: Editor, at: number, title: string) {
  editor
    .chain()
    .focus()
    .insertContentAt(at, [
      { type: 'wikiLink', attrs: { title } },
      { type: 'text', text: ' ' },
    ])
    .run();
}

export interface SlashCommand {
  id: string;
  label: string;
  /** Shown beside the label: what it does, or the markdown that does the same */
  hint: string;
  /** Other words that find it */
  keywords: string;
  /** Runs once the typed /command is gone from the text */
  run: (editor: Editor) => void;
}

export type SlashMenuState = MenuState<SlashCommand>;

interface SlashOptions {
  /** Read on each keystroke, so the labels follow the language */
  commands: () => ReadonlyArray<SlashCommand>;
  onState: (state: SlashMenuState | null) => void;
}

/** Typing / opens a list of commands; typing on narrows it */
export const SlashCommands = Extension.create<SlashOptions>({
  name: 'slashCommands',

  addOptions() {
    return { commands: () => [], onState: () => {} };
  },

  addProseMirrorPlugins() {
    const { commands, onState } = this.options;
    return [
      suggestionMenu<SlashCommand>({
        editor: this.editor,
        key: this.name,
        char: '/',
        allowSpaces: false,
        getItems: (query) => {
          const q = query.toLowerCase();
          return commands().filter((c) => `${c.label} ${c.keywords}`.toLowerCase().includes(q));
        },
        choose: (editor, range, command) => {
          editor.chain().focus().deleteRange(range).run();
          command.run(editor);
        },
        onState,
      }),
    ];
  },
});
