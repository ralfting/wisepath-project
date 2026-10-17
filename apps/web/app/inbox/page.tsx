import type { Metadata } from 'next';
import { InboxPage } from '@/features/inbox/list';
import { serverT } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await serverT();
  return { title: t('inbox.meta.title') };
}

export default function Inbox() {
  return <InboxPage />;
}
