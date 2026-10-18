import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Layer } from 'effect';
import { renderWithLayers } from '@/test/render';
import { MarkdownText } from './MarkdownText';

const hrefOf = (title: string) => (title === 'Hooks' ? '/p/react/hooks' : null);

describe('MarkdownText', () => {
  it('links [[Title]] to its page, leaves a page not made yet as text, and keeps code as written', () => {
    renderWithLayers(<MarkdownText content={'See [[Hooks]] then [[Later]].\n\n`[[Hooks]]` in code'} hrefOf={hrefOf} />, Layer.empty);
    const link = screen.getByRole('link', { name: 'Hooks' });
    expect(link.getAttribute('href')).toBe('/p/react/hooks');
    expect(link.getAttribute('target')).toBeNull();
    expect(screen.getByText(/then Later\./)).toBeTruthy();
    expect(screen.getByText('[[Hooks]]').tagName).toBe('CODE');
  });

  it("opens web addresses in a new tab as the author's links, and drops a script address", () => {
    renderWithLayers(<MarkdownText content={'[Docs](https://testing-library.com) and [bad](javascript:alert(1))'} hrefOf={hrefOf} />, Layer.empty);
    const docs = screen.getByRole('link', { name: 'Docs' });
    expect([docs.getAttribute('target'), docs.getAttribute('rel')]).toEqual(['_blank', 'ugc nofollow noopener noreferrer']);
    expect(screen.getByText('bad').getAttribute('href') ?? '').not.toContain('javascript');
  });

  it('renders tables and keeps the page title the only top heading', () => {
    renderWithLayers(<MarkdownText content={'# Setup\n\n| Tool | Use |\n| --- | --- |\n| MSW | mock the API |'} hrefOf={hrefOf} />, Layer.empty);
    expect(screen.getByRole('heading', { name: 'Setup', level: 2 })).toBeTruthy();
    expect(screen.getByRole('cell', { name: 'mock the API' })).toBeTruthy();
  });
});
