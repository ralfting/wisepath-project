import { PageDrawer } from '@/features/page';

interface PageDrawerRouteProps {
  params: Promise<{ pathId: string; pageId: string }>;
}

/**
 * /paths/:id/pages/:pageId reached from inside the app opens the page in a
 * drawer over the map, which stays mounted behind it. Loading the same URL
 * directly (reload, shared link, the expand button) renders the full page in
 * ../../pages/[pageId] instead.
 */
export default async function PageDrawerRoute({ params }: PageDrawerRouteProps) {
  const { pathId, pageId } = await params;
  return <PageDrawer pathId={pathId} pageId={pageId} />;
}
