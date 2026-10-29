import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PageId, PathId, activitiesIn, openTasks, questionsIn } from '@wisepath/domain/paths';
import type { Page, Path, PathKind } from '@wisepath/domain/paths';
import { renderWithLayers } from '@/test/render';
import { StudiedToggle } from './StudiedToggle';

const activities = '> [!activity]\n> Write two things.\n\n> [!activity]\n> Copy a sentence.';
const questions = '> [!question]\n> What did you like?';
const pageId = PageId.make('journal');
const pathId = PathId.make('reading');
const [first, second] = activitiesIn(pathId, { id: pageId, content: activities }).map((a) => a.id);
const [question] = questionsIn(pathId, { id: pageId, content: questions }).map((q) => q.id);

/** A path of one page with this text, the reader's ticks, answers and mark on it as given */
const aPath = (kind: PathKind, mark: Partial<Pick<Page, 'studied' | 'done' | 'answers'>>, content = activities): Path => {
  const page: Page = { id: pageId, title: 'A reading journal', content, studied: false, updatedAt: '2030-01-01T00:00:00.000Z', ...mark };
  return { id: pathId, title: 'Reading', kind, pages: [page], rootPageId: pageId, visibility: 'private', access: 'owner' };
};

const toggle = (path: Path, onShowText = vi.fn(), locale: 'en' | 'pt-BR' = 'en') =>
  renderWithLayers(
    <StudiedToggle path={path} page={path.pages[0]} open={openTasks(path, path.pages[0])} onChange={vi.fn()} onShowText={onShowText} />,
    undefined,
    locale,
  );

describe('the studied control on a page with activities', () => {
  it('says how many activities are left and takes the learner to the text', async () => {
    const user = userEvent.setup();
    const onShowText = vi.fn();
    toggle(aPath('learningPath', { done: [first] }), onShowText);

    await user.click(screen.getByRole('button', { name: '1 activity left' }));
    expect(onShowText).toHaveBeenCalled();
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('counts them in Portuguese too', () => {
    toggle(aPath('learningPath', {}), vi.fn(), 'pt-BR');
    expect(screen.getByRole('button', { name: 'Faltam 2 atividades' })).toBeTruthy();
  });

  it('counts a question to answer, and both kinds together', () => {
    toggle(aPath('learningPath', {}, questions));
    toggle(aPath('learningPath', { done: [first] }, `${activities}\n\n${questions}`));
    toggle(aPath('learningPath', {}, `${activities}\n\n${questions}`), vi.fn(), 'pt-BR');
    expect(screen.getByRole('button', { name: '1 question to answer' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '2 left to do' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Faltam 3 coisas a fazer' })).toBeTruthy();
  });

  it('marks the page studied once its question is answered', () => {
    toggle(aPath('learningPath', { answers: [{ question, body: 'The ending.' }] }, questions));
    expect(screen.getByRole('switch', { name: "I've studied this", checked: false })).toBeTruthy();
  });

  it('marks the page studied once they are done, and keeps a studied mark made before one was added', () => {
    toggle(aPath('learningPath', { done: [first, second] }));
    toggle(aPath('learningPath', { studied: true }));
    expect(screen.getByRole('switch', { name: "I've studied this", checked: false })).toBeTruthy();
    expect(screen.getByRole('switch', { name: 'Studied', checked: true })).toBeTruthy();
  });

  it('keeps a studied page studied when its author adds an activity, and points to what is new', async () => {
    const user = userEvent.setup();
    const onShowText = vi.fn();
    toggle(aPath('learningPath', { studied: true, done: [first] }), onShowText);

    expect(screen.getByRole('switch', { name: 'Studied', checked: true })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '1 activity left' }));
    expect(onShowText).toHaveBeenCalled();
  });
});
