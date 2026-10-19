import type { Metadata } from 'next';
import { CatalogPage } from '@/features/paths/catalog';
import { isLocale } from '@/i18n/locales';
import { serverT } from '@/i18n/server';
import { exploreHref } from '@/shared/routes';
import { publishedCatalog, site } from '@/useCases/paths/queries';

interface ExploreProps {
  searchParams: Promise<{ lang?: string | string[] }>;
}

/** The language asked for in the address, when it is one of ours; all of them otherwise */
const languageOf = async (searchParams: ExploreProps['searchParams']) => {
  const { lang } = await searchParams;
  return isLocale(lang) ? lang : null;
};

export async function generateMetadata({ searchParams }: ExploreProps): Promise<Metadata> {
  const [t, language] = await Promise.all([serverT(), languageOf(searchParams)]);
  const base = { title: t('catalog.explore.meta'), description: t('catalog.explore.description') };
  // Search engines are let in once the site has a domain of its own (SITE_URL, docs/DEPLOY.md)
  if (site() === null) return { ...base, robots: { index: false, follow: false } };
  return { ...base, alternates: { canonical: exploreHref(language ?? undefined) } };
}

export default async function Explore({ searchParams }: ExploreProps) {
  const [t, language, entries] = await Promise.all([serverT(), languageOf(searchParams), publishedCatalog()]);
  return <CatalogPage entries={entries} language={language} t={t} />;
}
