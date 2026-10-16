import type { Metadata } from 'next';
import { PathsHome } from '@/features/paths';
import { serverT } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await serverT();
  return { title: t('home.meta.paths') };
}

export default function PathsPage() {
  return <PathsHome />;
}
