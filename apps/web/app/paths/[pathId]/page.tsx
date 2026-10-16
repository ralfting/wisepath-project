import type { Metadata } from 'next';
import { PathMap } from '@/features/map';
import { serverT } from '@/i18n/server';

interface PathPageProps {
  params: Promise<{ pathId: string }>;
}

// The map loads in the browser, so the server can't name it yet
export async function generateMetadata(): Promise<Metadata> {
  const t = await serverT();
  return { title: t('home.meta.path') };
}

export default async function PathPage({ params }: PathPageProps) {
  const { pathId } = await params;
  return <PathMap pathId={pathId} />;
}
