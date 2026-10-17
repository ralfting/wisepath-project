import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PublicPath } from '@/features/paths/public';
import { serverT } from '@/i18n/server';
import { publicPath } from '@/useCases/paths/queries';

interface PublicPathPageProps {
  params: Promise<{ pathId: string }>;
}

// Public by its link only: never listed, and kept out of search engines
export async function generateMetadata({ params }: PublicPathPageProps): Promise<Metadata> {
  const [t, path] = await Promise.all([serverT(), params.then(({ pathId }) => publicPath(pathId))]);
  return {
    title: path ? t('share.public.meta', { title: path.title }) : t('share.public.notFoundTitle'),
    robots: { index: false, follow: false },
  };
}

export default async function PublicPathPage({ params }: PublicPathPageProps) {
  const { pathId } = await params;
  const path = await publicPath(pathId);
  if (!path) notFound();
  return <PublicPath path={path} />;
}
