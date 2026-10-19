import type { Metadata } from 'next';
import { CatalogPage } from '@/features/paths/catalog';
import { isLocale } from '@/i18n/locales';
import { serverT } from '@/i18n/server';
import { exploreHref } from '@/shared/routes';
import { publishedCatalog, site } from '@/useCases/paths/queries';

interface ExploreProps {
  searchParams: Promise<{ q?: string | string[]; lang?: string | string[]; page?: string | string[] }>;
}

/** What the address asks for: the words searched, a language of ours, a page of results; anything else is ignored */
const filterOf = async (searchParams: ExploreProps['searchParams']) => {
  const { q, lang, page } = await searchParams;
  const words = typeof q === 'string' ? q.trim().slice(0, 200) : '';
  const number = typeof page === 'string' ? Number.parseInt(page, 10) : 1;
  return { q: words || null, language: isLocale(lang) ? lang : null, page: Number.isFinite(number) && number > 0 ? number : 1 };
};

export async function generateMetadata({ searchParams }: ExploreProps): Promise<Metadata> {
  const [t, filter] = await Promise.all([serverT(), filterOf(searchParams)]);
  const base = { title: t('catalog.explore.meta'), description: t('catalog.explore.description') };
  // Search engines are let in once the site has a domain of its own (SITE_URL, docs/DEPLOY.md); a search's results
  // are not a page of their own for them, the catalog is
  if (site() === null || filter.q) return { ...base, robots: { index: false, follow: true } };
  return { ...base, alternates: { canonical: exploreHref({ lang: filter.language, page: filter.page }) } };
}

export default async function Explore({ searchParams }: ExploreProps) {
  const [t, filter] = await Promise.all([serverT(), filterOf(searchParams)]);
  const entries = await publishedCatalog(filter.q, filter.language);
  return <CatalogPage entries={entries} q={filter.q} language={filter.language} page={filter.page} t={t} />;
}
