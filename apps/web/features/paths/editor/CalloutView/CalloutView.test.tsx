import { useState } from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PageId, PathId, questionsIn } from '@wisepath/domain/paths';
import { MemoryAuth } from '@/infrastructure/auth/MemoryAuth';
import { renderWithLayers } from '@/test/render';
import { MarkdownEditor } from '../MarkdownEditor/MarkdownEditor';

const noop = () => {};
const QUESTIONS = '> [!question]\n> What makes a habit last?\n\n> [!question]\n> Which one will you keep?\n\nLater.';
const idsOf = (content: string) => questionsIn(PathId.make('habits'), { id: PageId.make('page'), content }).map((question) => question.id);
const [FIRST] = idsOf(QUESTIONS);

/** A page as PageContent gives it to the editor: what is saved comes back as the content, and the ids follow it */
function Page({ readOnly = false, onChange = noop }: { readOnly?: boolean; onChange?: (content: string) => void }) {
  const [content, setContent] = useState(QUESTIONS);
  return (
    <MarkdownEditor
      content={content}
      onChange={(next) => {
        setContent(next);
        onChange(next);
      }}
      pages={[]}
      currentPageId="page"
      onOpenPage={noop}
      onLinkPage={noop}
      onCreatePage={noop}
      onCreatePageHere={noop}
      readOnly={readOnly}
      questions={{ ids: idsOf(content), answers: [{ question: FIRST, body: 'Cues.' }], onAnswer: noop }}
    />
  );
}

const notes = () => screen.getAllByRole('note', { name: 'Question' });
const answerIn = (note: HTMLElement) => (within(note).getByRole('textbox', { name: 'Your answer' }) as HTMLTextAreaElement).value;

describe('moving and picking a callout', () => {
  it('gives each block a grip while the text is editable, and none to a reader, who can still answer', async () => {
    const view = renderWithLayers(<Page />, MemoryAuth());
    expect(await screen.findAllByRole('button', { name: 'Move or select the block' })).toHaveLength(2);

    view.unmount();
    renderWithLayers(<Page readOnly />, MemoryAuth());
    expect(await screen.findAllByRole('textbox', { name: 'Your answer' })).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Move or select the block' })).toBeNull();
  });

  it('picks the whole block from its grip: copied it is its markdown, cut and pasted it comes back a question', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithLayers(<Page onChange={onChange} />, MemoryAuth());
    const [grip] = await screen.findAllByRole('button', { name: 'Move or select the block' });

    await user.click(grip);
    expect((await user.copy())?.getData('text/plain')).toBe('> [!question]\n> What makes a habit last?');

    const cut = await user.cut();
    expect(notes()).toHaveLength(1);
    expect(onChange).toHaveBeenLastCalledWith('> [!question]\n> Which one will you keep?\n\nLater.');

    const later = screen.getByText('Later.');
    await user.pointer({ target: later, offset: later.textContent?.length, keys: '[MouseLeft]' });
    await user.paste(cut);
    expect(notes()).toHaveLength(2);
    expect(onChange).toHaveBeenLastCalledWith('> [!question]\n> Which one will you keep?\n\nLater.\n\n> [!question]\n> What makes a habit last?');
  });

  it('moves a picked question down with Alt+Shift+ArrowDown, its answer going with it', async () => {
    const user = userEvent.setup();
    renderWithLayers(<Page />, MemoryAuth());
    const [grip] = await screen.findAllByRole('button', { name: 'Move or select the block' });
    expect(notes().map(answerIn)).toEqual(['Cues.', '']);

    await user.click(grip);
    await user.keyboard('{Alt>}{Shift>}{ArrowDown}{/Shift}{/Alt}');

    const [first, second] = notes();
    expect(within(first).getByText('Which one will you keep?')).toBeTruthy();
    expect(within(second).getByText('What makes a habit last?')).toBeTruthy();
    expect([answerIn(first), answerIn(second)]).toEqual(['', 'Cues.']);
  });
});
