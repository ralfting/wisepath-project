import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
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

/** A read-only text with the reader's notes, as someone else's page shows it to them */
const readOnlyWithNotes = (content: string, items: EditorNotes['items']) => {
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
      readOnly
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

  it('keeps a quote of another kind, or with no marker, a plain quote', async () => {
    editor('> [!note]\n> GitHub kind\n\n> Said once');
    expect(await screen.findByText(/GitHub kind/)).toBeTruthy();
    expect(screen.queryByRole('note')).toBeNull();
  });

  describe("with the reader's notes", () => {
    it('highlights the passage a note is on, finds it, and opens the note from it', async () => {
      const user = userEvent.setup();
      const quote = { exact: 'borrow', prefix: 'mutable ', suffix: ' at a time' };
      const notes = readOnlyWithNotes('One borrow or another.\n\nOne mutable **borrow** at a time.', [
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

    it('offers Note on words selected in a text the reader may not edit, quoting them', async () => {
      const user = userEvent.setup();
      const notes = readOnlyWithNotes('Two shared borrows may overlap.', []);
      const text = (await screen.findByText('Two shared borrows may overlap.')).firstChild!;

      const selection = document.getSelection()!;
      selection.setBaseAndExtent(text, 4, text, 10);
      document.dispatchEvent(new Event('selectionchange'));
      await user.click(await screen.findByRole('button', { name: 'Note', hidden: true }));

      expect(notes.onSelection).toHaveBeenCalledWith({ exact: 'shared', prefix: 'Two ', suffix: ' borrows may overlap.' }, expect.anything());
      expect(screen.queryByRole('button', { name: 'Bold', hidden: true })).toBeNull();
    });
  });
});
