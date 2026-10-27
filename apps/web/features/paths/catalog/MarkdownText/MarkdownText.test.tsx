import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Layer } from 'effect';
import { translate } from '@/i18n/format';
import type { Translate } from '@/i18n/I18nProvider';
import { en } from '@/i18n/messages/en';
import { renderWithLayers } from '@/test/render';
import { MarkdownText } from './MarkdownText';
import classes from './MarkdownText.module.css';

const hrefOf = (title: string) => (title === 'Hooks' ? '/p/react/hooks' : null);
const t: Translate = (key, values) => translate(en, en, 'en', key, values);

describe('MarkdownText', () => {
  it('links [[Title]] to its page, leaves a page not made yet as text, and keeps code as written', () => {
    renderWithLayers(<MarkdownText content={'See [[Hooks]] then [[Later]].\n\n`[[Hooks]]` in code'} hrefOf={hrefOf} t={t} />, Layer.empty);
    const link = screen.getByRole('link', { name: 'Hooks' });
    expect(link.getAttribute('href')).toBe('/p/react/hooks');
    expect(link.getAttribute('target')).toBeNull();
    expect(screen.getByText(/then Later\./)).toBeTruthy();
    expect(screen.getByText('[[Hooks]]').tagName).toBe('CODE');
  });

  it('links @[[Title]] to its page as a quieter link, and leaves a citation of a page not made yet as its title', () => {
    renderWithLayers(<MarkdownText content={'As in @[[Hooks]] and [[Hooks]], see @[[Later]].'} hrefOf={hrefOf} t={t} />, Layer.empty);
    const [citation, link] = screen.getAllByRole('link', { name: 'Hooks' });
    expect([citation.getAttribute('href'), citation.classList.contains(classes.citation)]).toEqual(['/p/react/hooks', true]);
    expect(link.classList.contains(classes.citation)).toBe(false);
    expect(screen.getByText(/, see Later\.$/)).toBeTruthy();
  });

  it("opens web addresses in a new tab as the author's links, and drops a script address", () => {
    renderWithLayers(<MarkdownText content={'[Docs](https://testing-library.com) and [bad](javascript:alert(1))'} hrefOf={hrefOf} t={t} />, Layer.empty);
    const docs = screen.getByRole('link', { name: 'Docs' });
    expect([docs.getAttribute('target'), docs.getAttribute('rel')]).toEqual(['_blank', 'ugc nofollow noopener noreferrer']);
    expect(screen.getByText('bad').getAttribute('href') ?? '').not.toContain('javascript');
  });

  it('renders tables and keeps the page title the only top heading', () => {
    renderWithLayers(<MarkdownText content={'# Setup\n\n| Tool | Use |\n| --- | --- |\n| MSW | mock the API |'} hrefOf={hrefOf} t={t} />, Layer.empty);
    expect(screen.getByRole('heading', { name: 'Setup', level: 2 })).toBeTruthy();
    expect(screen.getByRole('cell', { name: 'mock the API' })).toBeTruthy();
  });

  it('draws a > [!kind] quote as a callout of that kind, and leaves other quotes as quotes', () => {
    renderWithLayers(<MarkdownText content={'> [!danger]\n> Never run it on [[Hooks]].\n\n> [!note]\n> Plain'} hrefOf={hrefOf} t={t} />, Layer.empty);
    const callout = screen.getByRole('note', { name: 'Danger' });
    expect(within(callout).getByRole('link', { name: 'Hooks' })).toBeTruthy();
    expect(callout.textContent).not.toContain('[!danger]');
    expect(screen.getAllByRole('note')).toHaveLength(1);
    expect(screen.getByText(/Plain/).closest('blockquote')).toBeTruthy();
  });

  it('draws an activity as its box with nothing to tick: the catalog has no reader', () => {
    renderWithLayers(<MarkdownText content={'> [!activity]\n> Write two things you like.'} hrefOf={hrefOf} t={t} />, Layer.empty);
    const activity = screen.getByRole('note', { name: 'Activity' });
    expect(activity.textContent).toContain('Write two things you like.');
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('draws a question as its box with no answer field', () => {
    renderWithLayers(<MarkdownText content={'> [!question]\n> What makes a habit last?'} hrefOf={hrefOf} t={t} />, Layer.empty);
    expect(screen.getByRole('note', { name: 'Question' }).textContent).toContain('What makes a habit last?');
    expect(screen.queryByRole('textbox')).toBeNull();
  });
});
