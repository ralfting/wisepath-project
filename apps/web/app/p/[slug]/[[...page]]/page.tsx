import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { pageAt } from '@wisepath/domain/paths';
import { PublishedPage } from '@/features/paths/catalog';
import { serverT } from '@/i18n/server';
import { catalogHref } from '@/shared/routes';
import { publishedPath, site } from '@/useCases/paths/queries';

interface PublishedPageRouteProps {
  params: Promise<{ slug: string; page?: string[] }>;
}

/** The published path and the page at the address; none for an unknown path, page or a deeper address */
async function read(params: PublishedPageRouteProps['params']) {
  const { slug, page } = await params;
  if (page && page.length > 1) return null;
  const path = await publishedPath(slug);
  const current = path ? pageAt(path, page?.[0] ?? null) : undefined;
  return path && current ? { path, slug, page: current, href: catalogHref(slug, page?.[0]) } : null;
}

export async function generateMetadata({ params }: PublishedPageRouteProps): Promise<Metadata> {
  const [t, found] = await Promise.all([serverT(), read(params)]);
  if (!found) return { title: t('share.public.notFoundTitle') };
  const { path, page, href } = found;
  const title = page.id === path.rootPageId ? t('catalog.metaRoot', { path: path.title }) : t('catalog.meta', { page: page.title, path: path.title });
  const description = path.description;
  // Search engines are let in once the site has a domain of its own (SITE_URL, docs/DEPLOY.md)
  if (site() === null) return { title, ...(description ? { description } : {}), robots: { index: false, follow: false } };
  return {
    title,
    ...(description ? { description } : {}),
    alternates: { canonical: href },
    openGraph: {
      type: 'article',
      siteName: 'WisePath',
      title,
      url: href,
      ...(description ? { description } : {}),
      ...(path.language ? { locale: path.language === 'pt-BR' ? 'pt_BR' : 'en_US' } : {}),
    },
  };
}

export default async function PublishedPageRoute({ params }: PublishedPageRouteProps) {
  const found = await read(params);
  if (!found) notFound();
  return <PublishedPage path={found.path} pathSlug={found.slug} page={found.page} t={await serverT()} />;
}
