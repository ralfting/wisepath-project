import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryAuth } from '@/infrastructure/auth/MemoryAuth';
import { renderWithLayers } from '@/test/render';
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
});
