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
const testing = entry({ slug: 'testes-em-react', title: 'Testes em React', description: 'Testar pelo comportamento', audience: 'Frontend', language: 'pt-BR', pages: [{ slug: 'msw', updatedAt: '' }] });

describe('CatalogPage', () => {
  it('shows a card for every path found, how many, and language filters that keep the search', () => {
    renderWithLayers(<CatalogPage entries={[testing, entry({ slug: 'rust', title: 'Rust', language: 'en' })]} q="test" language={null} page={1} t={t} />);
    expect(screen.getByRole('link', { name: 'Testes em React' }).getAttribute('href')).toBe('/p/testes-em-react');
    expect(screen.getByText('For: Frontend')).toBeTruthy();
    expect(screen.getByText('Português (Brasil) · 2 pages')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('2 paths');
    expect((screen.getByRole('searchbox', { name: 'Search paths' }) as HTMLInputElement).value).toBe('test');
    expect(screen.getByRole('link', { name: 'All' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: 'Português (Brasil)' }).getAttribute('href')).toBe('/explore?q=test&lang=pt-BR');
  });

  it('shows a page of results at a time, with the way to the others', () => {
    const many = Array.from({ length: 30 }, (_, index) => entry({ slug: `path-${index + 1}`, title: `Path ${index + 1}` }));
    renderWithLayers(<CatalogPage entries={many} q={null} language="en" page={2} t={t} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(6);
    expect(screen.getByRole('link', { name: 'Path 25' })).toBeTruthy();
    expect(screen.getByText('Page 2 of 2')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Previous/ }).getAttribute('href')).toBe('/explore?lang=en');
    expect(screen.queryByRole('link', { name: /Next/ })).toBeNull();
  });

  it('says when nothing matches the search', () => {
    renderWithLayers(<CatalogPage entries={[]} q="python" language={null} page={1} t={t} />);
    expect(screen.getByText('No path matches “python”.')).toBeTruthy();
  });
});
