import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Layer } from 'effect';
import { describe, expect, it } from 'vitest';
import { PageId, PathId, questionsIn } from '@wisepath/domain/paths';
import { MemoryAuth } from '@/infrastructure/auth/MemoryAuth';
import { MemoryLinkPreviews, aLinkPreview } from '@/infrastructure/links/MemoryLinkPreviews';
import { renderWithLayers } from '@/test/render';
import { MarkdownEditor } from '../MarkdownEditor';

const noop = () => {};

describe('Outline', () => {
  it('lists questions and videos by kind beside the headings, an answered question told apart', async () => {
    const user = userEvent.setup();
    const content = [
      '## Routes',
      'https://www.youtube.com/watch?v=known',
      '> [!question]\n> ### Why guard a route?',
      '> [!question]\n> What does a guard return?',
      '## Tests',
      'https://www.youtube.com/watch?v=unknown',
    ].join('\n\n');
    const ids = questionsIn(PathId.make('routes'), { id: PageId.make('page'), content }).map((question) => question.id);
    const questions = { ids, answers: [{ question: ids[0], body: 'Who calls it.' }], onAnswer: noop };
    // Only the first video's page gives a title
    const previews = MemoryLinkPreviews({ 'https://www.youtube.com/watch?v=known': aLinkPreview({ title: 'Guards in five minutes' }) });
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
        questions={questions}
      />,
      Layer.mergeAll(MemoryAuth(), previews),
    );

    await user.hover(await screen.findByRole('button', { name: 'Contents' }));
    expect(await screen.findByRole('button', { name: 'Video: Guards in five minutes' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Answered question: Why guard a route?' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Question: What does a guard return?' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Video: Video' })).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /^(Routes|Tests)$/ })).toHaveLength(2);
  });
});
