import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { pageAt } from '@wisepath/domain/paths';
import { PublishedPage } from '@/features/paths/catalog';
import { serverT } from '@/i18n/server';
import { publishedPath } from '@/useCases/paths/queries';

interface PublishedPageRouteProps {
  params: Promise<{ slug: string; page?: string[] }>;
}

/** The published path and the page at the address; none for an unknown path, page or a deeper address */
async function read(params: PublishedPageRouteProps['params']) {
  const { slug, page } = await params;
  if (page && page.length > 1) return null;
  const path = await publishedPath(slug);
  const current = path ? pageAt(path, page?.[0] ?? null) : undefined;
  return path && current ? { path, slug, page: current } : null;
}

export async function generateMetadata({ params }: PublishedPageRouteProps): Promise<Metadata> {
  const [t, found] = await Promise.all([serverT(), read(params)]);
  if (!found) return { title: t('share.public.notFoundTitle') };
  const { path, page } = found;
  const isRoot = page.id === path.rootPageId;
  return {
    title: isRoot ? t('catalog.metaRoot', { path: path.title }) : t('catalog.meta', { page: page.title, path: path.title }),
    ...(path.description ? { description: path.description } : {}),
    // Search engines come with a domain of our own and the sitemap (docs/plans/20-published-pages.md)
    robots: { index: false, follow: false },
  };
}

export default async function PublishedPageRoute({ params }: PublishedPageRouteProps) {
  const found = await read(params);
  if (!found) notFound();
  return <PublishedPage path={found.path} pathSlug={found.slug} page={found.page} t={await serverT()} />;
}
