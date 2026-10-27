import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PageId, PathId, activitiesIn, questionsIn } from '@wisepath/domain/paths';
import { MemoryAuth } from '@/infrastructure/auth/MemoryAuth';
import { renderWithLayers } from '@/test/render';
import type { EditorNotes } from '../noteHighlights';
import { MarkdownEditor } from './MarkdownEditor';

const noop = () => {};

const editor = (content: string, onChange = noop) =>
  renderWithLayers(
    <MarkdownEditor
      content={content}
      onChange={onChange}
      pages={[]}
      currentPageId="page"
      onOpenPage={noop}
      onLinkPage={noop}
      onCreatePage={noop}
      onCreatePageHere={noop}
    />,
    MemoryAuth(),
  );

/** A text with the reader's notes; read-only as someone else's page shows it to them */
const withNotes = (content: string, items: EditorNotes['items'], readOnly = true) => {
  const notes = { items, openId: null, onOpen: vi.fn(), onSelection: vi.fn(), onFound: vi.fn() };
  renderWithLayers(
    <MarkdownEditor
      content={content}
      onChange={noop}
      pages={[]}
      currentPageId="page"
      onOpenPage={noop}
      onLinkPage={noop}
      onCreatePage={noop}
      onCreatePageHere={noop}
      readOnly={readOnly}
      notes={notes}
    />,
    MemoryAuth(),
  );
  return notes;
};

describe('MarkdownEditor', () => {
  it('saves nothing when a page is only opened', async () => {
    const onChange = vi.fn();
    editor('Some text', onChange);

    expect(await screen.findByText('Some text')).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('opens a link written to a bare host as that site, in a new tab, with Cmd or Ctrl and a click', async () => {
    const opened: Array<{ href: string; target: string }> = [];
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      opened.push({ href: this.href, target: this.target });
    });
    editor('See [www.google.com](www.google.com)');

    const link = await screen.findByRole('link', { name: 'www.google.com' });
    expect(link.getAttribute('href')).toBe('https://www.google.com');
    fireEvent.click(link);
    expect(opened).toEqual([]);
    fireEvent.click(link, { metaKey: true });
    fireEvent.click(link, { ctrlKey: true });
    expect(opened).toEqual([
      { href: 'https://www.google.com/', target: '_blank' },
      { href: 'https://www.google.com/', target: '_blank' },
    ]);
    click.mockRestore();
  });

  it('shows a [!warning] quote as a callout and changes its kind from its icon', async () => {
    const user = userEvent.setup();
    editor('Before\n\n> [!warning]\n> Back up first.');

    const callout = await screen.findByRole('note', { name: 'Warning' });
    expect(within(callout).getByText('Back up first.')).toBeTruthy();
    expect(within(callout).queryByText(/\[!warning\]/)).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Warning: change the callout' }));
    // happy-dom lays nothing out, so the menu takes its icon for scrolled away and hides itself: hidden finds it anyway
    await user.click(await screen.findByRole('menuitem', { name: 'Danger', hidden: true }));

    expect(await screen.findByRole('note', { name: 'Danger' })).toBeTruthy();
  });

  it('shows a [!activity] quote as an activity, which the kind menu turns into a callout and back', async () => {
    const user = userEvent.setup();
    editor('> [!activity]\n> Write two things you like.');

    const activity = await screen.findByRole('note', { name: 'Activity' });
    expect(within(activity).getByText('Write two things you like.')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Activity: change the callout' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Info', hidden: true }));
    await user.click(await screen.findByRole('button', { name: 'Info: change the callout' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Activity', hidden: true }));

    expect(await screen.findByRole('note', { name: 'Activity' })).toBeTruthy();
  });

  it('shows a [!question] quote as a question, which the kind menu turns into a callout', async () => {
    const user = userEvent.setup();
    editor('> [!question]\n> What makes a habit last?');

    const question = await screen.findByRole('note', { name: 'Question' });
    expect(within(question).getByText('What makes a habit last?')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Question: change the callout' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Info', hidden: true }));
    expect(await screen.findByRole('note', { name: 'Info' })).toBeTruthy();
  });

  it("lets a reader tick each activity of a learning path's page, by the domain's name for it", async () => {
    const user = userEvent.setup();
    const content = '> [!activity]\n> Write **two** things.\n\nBetween.\n\n> [!activity]\n> Copy a sentence.';
    const [first, second] = activitiesIn(PathId.make('journal'), { id: PageId.make('page'), content }).map((a) => a.id);
    const onToggle = vi.fn();
    const props = { content, onChange: noop, pages: [], currentPageId: 'page', onOpenPage: noop, onLinkPage: noop, onCreatePage: noop, onCreatePageHere: noop };
    const view = renderWithLayers(<MarkdownEditor {...props} readOnly activities={{ ids: [first, second], done: [first], onToggle }} />, MemoryAuth());

    expect(await screen.findByRole('switch', { name: 'Done', checked: true })).toBeTruthy();
    await user.click(screen.getByRole('switch', { name: 'Mark as done', checked: false }));
    expect(onToggle).toHaveBeenCalledWith(second);

    view.rerender(<MarkdownEditor {...props} readOnly activities={{ ids: [first, second], done: [first, second], onToggle }} />);
    expect(await screen.findAllByRole('switch', { name: 'Done', checked: true })).toHaveLength(2);
  });

  it("gives each question its reader's own answer field, saved as they leave it, in a page they may only read", async () => {
    const user = userEvent.setup();
    const content = '> [!question]\n> What makes a habit last?\n\n> [!question]\n> Which one will you keep?';
    const [first, second] = questionsIn(PathId.make('habits'), { id: PageId.make('page'), content }).map((q) => q.id);
    const onAnswer = vi.fn();
    const onChange = vi.fn();
    const props = { content, onChange, pages: [], currentPageId: 'page', onOpenPage: noop, onLinkPage: noop, onCreatePage: noop, onCreatePageHere: noop };
    const questions = { ids: [first, second], answers: [{ question: first, body: 'Cues.' }], onAnswer };
    renderWithLayers(<MarkdownEditor {...props} readOnly questions={questions} />, MemoryAuth());

    const fields = await screen.findAllByRole('textbox', { name: 'Your answer' });
    expect(fields.map((field) => (field as HTMLTextAreaElement).value)).toEqual(['Cues.', '']);
    await user.type(fields[1], 'Reading every day');
    await user.tab();
    expect(onAnswer).toHaveBeenCalledWith(second, 'Reading every day');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('draws a question with no answer field when nobody is reading', async () => {
    editor('> [!question]\n> What makes a habit last?');
    expect(await screen.findByRole('note', { name: 'Question' })).toBeTruthy();
    expect(screen.queryByRole('textbox', { name: 'Your answer' })).toBeNull();
  });

  it('keeps a quote of another kind, or with no marker, a plain quote', async () => {
    editor('> [!note]\n> GitHub kind\n\n> Said once');
    expect(await screen.findByText(/GitHub kind/)).toBeTruthy();
    expect(screen.queryByRole('note')).toBeNull();
  });

  describe("with the reader's notes", () => {
    it('highlights the passage a note is on, finds it, and opens the note from it', async () => {
      const user = userEvent.setup();
      const quote = { exact: 'borrow', prefix: 'mutable ', suffix: ' at a time' };
      const notes = withNotes('One borrow or another.\n\nOne mutable **borrow** at a time.', [
        { id: 'on-passage', quote },
        { id: 'gone', quote: { exact: 'lifetime', prefix: '', suffix: '' } },
        { id: 'on-page' },
      ]);

      const passage = await screen.findByText('borrow', { selector: '.wp-page-note' });
      expect(passage.getAttribute('data-page-note')).toBe('on-passage');
      expect(notes.onFound).toHaveBeenLastCalledWith(['on-passage']);
      await user.click(passage);
      expect(notes.onOpen).toHaveBeenCalledWith('on-passage', expect.objectContaining({ top: expect.any(Number) }));
    });

    it('marks the end of a noted passage with a speech bubble that opens the note too, and is not text', async () => {
      const user = userEvent.setup();
      const quote = { exact: 'mutable borrow', prefix: 'One ', suffix: ' at a time' };
      const notes = withNotes('One mutable borrow at a time.', [{ id: 'on-passage', quote }]);

      const passage = await screen.findByText('mutable borrow', { selector: '.wp-page-note' });
      const mark = document.querySelector('.wp-page-note-mark[data-page-note="on-passage"]')!;
      expect(mark.textContent).toBe('');
      expect(passage.closest('p')!.textContent).toBe('One mutable borrow at a time.');
      await user.click(mark);
      expect(notes.onOpen).toHaveBeenCalledWith('on-passage', expect.objectContaining({ top: expect.any(Number) }));
    });

    it('numbers the bubbles of each block, so a second note in a paragraph sits beside the first in the margin', async () => {
      const quote = (exact: string) => ({ exact, prefix: '', suffix: '' });
      withNotes('Shared borrows overlap.\n\nA mutable borrow is alone.', [
        { id: 'shared', quote: quote('Shared') },
        { id: 'overlap', quote: quote('overlap') },
        { id: 'alone', quote: quote('alone') },
      ]);

      await screen.findByText('alone', { selector: '.wp-page-note' });
      const nth = (id: string) => (document.querySelector(`.wp-page-note-mark[data-page-note="${id}"]`) as HTMLElement).style.getPropertyValue('--wp-mark-nth');
      expect([nth('shared'), nth('overlap'), nth('alone')]).toEqual(['0', '1', '0']);
    });

    it('offers Note on words selected in a text the reader may not edit, quoting them', async () => {
      const user = userEvent.setup();
      const notes = withNotes('Two shared borrows may overlap.', []);
      const text = (await screen.findByText('Two shared borrows may overlap.')).firstChild!;

      const selection = document.getSelection()!;
      selection.setBaseAndExtent(text, 4, text, 10);
      document.dispatchEvent(new Event('selectionchange'));
      await user.click(await screen.findByRole('button', { name: 'Note', hidden: true }));

      expect(notes.onSelection).toHaveBeenCalledWith({ exact: 'shared', prefix: 'Two ', suffix: ' borrows may overlap.' }, expect.anything());
      expect(screen.queryByRole('button', { name: 'Bold', hidden: true })).toBeNull();
    });

    it('offers Note beside the formatting to someone who may edit the text', async () => {
      const user = userEvent.setup();
      const notes = withNotes('Two shared borrows may overlap.', [], false);
      const text = (await screen.findByText('Two shared borrows may overlap.')).firstChild!;
      (text.parentElement!.closest('[contenteditable]') as HTMLElement).focus();

      document.getSelection()!.setBaseAndExtent(text, 4, text, 10);
      document.dispatchEvent(new Event('selectionchange'));
      expect(await screen.findByRole('button', { name: 'Bold', hidden: true })).toBeTruthy();
      await user.click(screen.getByRole('button', { name: 'Note', hidden: true }));

      expect(notes.onSelection).toHaveBeenCalledWith({ exact: 'shared', prefix: 'Two ', suffix: ' borrows may overlap.' }, expect.anything());
    });
  });
});

describe('citing a page', () => {
  const pages = [
    { id: 'market', title: 'Market', content: 'Who buys.' },
    { id: 'basics', title: 'Basics', content: 'Where to start.' },
  ];

  it('turns a link into a citation from its card, and a citation back into a link, saving @[[ ]]', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithLayers(
      <MarkdownEditor
        content="As in @[[Market]], start with [[Basics]]."
        onChange={onChange}
        pages={pages}
        currentPageId="page"
        onOpenPage={noop}
        onLinkPage={noop}
        onCreatePage={noop}
        onCreatePageHere={noop}
      />,
      MemoryAuth(),
    );

    const market = await screen.findByRole('link', { name: 'Market' });
    expect(market.hasAttribute('data-citation')).toBe(true);
    expect(screen.getByRole('link', { name: 'Basics' }).hasAttribute('data-citation')).toBe(false);

    await user.hover(screen.getByRole('link', { name: 'Basics' }));
    await user.click(await screen.findByRole('button', { name: 'Make it a citation' }));
    expect(onChange).toHaveBeenLastCalledWith('As in @[[Market]], start with @[[Basics]].');
    expect(screen.getByRole('button', { name: 'Make it a link' })).toBeTruthy();

    await user.hover(screen.getByRole('link', { name: 'Market' }));
    await screen.findByText('Who buys.');
    await user.click(screen.getByRole('button', { name: 'Make it a link' }));
    expect(onChange).toHaveBeenLastCalledWith('As in [[Market]], start with @[[Basics]].');
  });
});
