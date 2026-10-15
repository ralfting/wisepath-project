import type { Metadata } from 'next';
import { ReviewPage } from '@/features/review';
import { serverT } from '@/i18n/server';

interface ReviewRouteProps {
  /** ?path= limits the review to one path */
  searchParams: Promise<{ path?: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await serverT();
  return { title: t('review.meta.title') };
}

export default async function ReviewRoute({ searchParams }: ReviewRouteProps) {
  const { path } = await searchParams;
  return <ReviewPage projectId={path || null} />;
}
