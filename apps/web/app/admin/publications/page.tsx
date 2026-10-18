import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PublicationQueue } from '@/features/paths/publications';
import { serverT } from '@/i18n/server';
import { pendingPublications } from '@/useCases/paths/queries';

export async function generateMetadata(): Promise<Metadata> {
  const t = await serverT();
  return { title: t('admin.publications.meta'), robots: { index: false, follow: false } };
}

/** The requests to publish, for WisePath's administrators; anyone else finds nothing here */
export default async function PublicationsPage() {
  const requests = await pendingPublications();
  if (!requests) notFound();
  return <PublicationQueue requests={requests} now={Date.now()} />;
}
