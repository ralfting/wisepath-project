import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryAuth } from '@/infrastructure/auth/MemoryAuth';
import { renderWithLayers } from '@/test/render';
import { MarkdownEditor } from './MarkdownEditor';

const noop = () => {};

describe('MarkdownEditor', () => {
  it('saves nothing when a page is only opened', async () => {
    const onChange = vi.fn();
    renderWithLayers(
      <MarkdownEditor
        content="Some text"
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

    expect(await screen.findByText('Some text')).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });
});
