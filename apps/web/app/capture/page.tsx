import type { Metadata } from 'next';
import { WebCapture } from '@/features/capture/WebCapture';
import { readWebPage } from '@/features/capture/webPage';
import { serverT } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await serverT();
  return { title: t('capture.window.meta.title') };
}

interface CaptureRouteProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** The bookmarklet's window: what it sent, read on the server so the page is filled in from the first render */
export default async function CaptureRoute({ searchParams }: CaptureRouteProps) {
  const query = await searchParams;
  const page = readWebPage({ get: (name) => (typeof query[name] === 'string' ? query[name] : null) });
  return <WebCapture page={page} />;
}
