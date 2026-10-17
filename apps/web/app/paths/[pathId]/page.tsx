import type { Metadata } from 'next';
import { PathMap } from '@/features/map';
import { serverT } from '@/i18n/server';
import { pathTitle } from '@/useCases/paths/queries';

interface PathPageProps {
  params: Promise<{ pathId: string }>;
}

// The tab is named after the map, read on the server with the learner's session; the generic name otherwise
export async function generateMetadata({ params }: PathPageProps): Promise<Metadata> {
  const [t, title] = await Promise.all([serverT(), params.then(({ pathId }) => pathTitle(pathId))]);
  return { title: title ? t('home.meta.pathNamed', { title }) : t('home.meta.path') };
}

export default async function PathPage({ params }: PathPageProps) {
  const { pathId } = await params;
  return <PathMap pathId={pathId} />;
}
