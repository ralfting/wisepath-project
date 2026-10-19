import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { CatalogEntry } from '@wisepath/domain/paths';
import { translate } from '@/i18n/format';
import type { Translate } from '@/i18n/I18nProvider';
import { en } from '@/i18n/messages/en';
import { renderWithLayers } from '@/test/render';
import { CatalogPage } from './CatalogPage';

const t: Translate = (key, values) => translate(en, en, 'en', key, values);
const entry = (fields: Partial<CatalogEntry> & Pick<CatalogEntry, 'slug' | 'title'>): CatalogEntry => ({ updatedAt: '', pages: [], ...fields });
const entries = [
  entry({ slug: 'testes-em-react', title: 'Testes em React', description: 'Testar pelo comportamento', audience: 'Frontend', language: 'pt-BR', pages: [{ slug: 'msw', updatedAt: '' }] }),
  entry({ slug: 'rust', title: 'Rust', language: 'en' }),
];

describe('CatalogPage', () => {
  it('shows a card for every published path, each opening its address, with what it teaches and its size', () => {
    renderWithLayers(<CatalogPage entries={entries} language={null} t={t} />);
    expect(screen.getByRole('link', { name: 'Testes em React' }).getAttribute('href')).toBe('/p/testes-em-react');
    expect(screen.getByRole('link', { name: 'Rust' }).getAttribute('href')).toBe('/p/rust');
    expect(screen.getByText('For: Frontend')).toBeTruthy();
    expect(screen.getByText('Português (Brasil) · 2 pages')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'All' }).getAttribute('aria-current')).toBe('page');
  });

  it('keeps the paths in the language chosen, and says when there are none', () => {
    const { unmount } = renderWithLayers(<CatalogPage entries={entries} language="pt-BR" t={t} />);
    expect(screen.queryByRole('link', { name: 'Rust' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Português (Brasil)' }).getAttribute('href')).toBe('/explore?lang=pt-BR');
    unmount();

    renderWithLayers(<CatalogPage entries={[]} language={null} t={t} />);
    expect(screen.getByText('No paths here yet.')).toBeTruthy();
  });
});
