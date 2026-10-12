import { PageDrawer } from '@/features/page';

interface PageDrawerRouteProps {
  params: Promise<{ projectId: string; pageId: string }>;
}

/**
 * /projects/:id/pages/:pageId reached from inside the app opens the page in a
 * drawer over the map, which stays mounted behind it. Loading the same URL
 * directly (reload, shared link, the expand button) renders the full page in
 * ../../pages/[pageId] instead.
 */
export default async function PageDrawerRoute({ params }: PageDrawerRouteProps) {
  const { projectId, pageId } = await params;
  return <PageDrawer projectId={projectId} pageId={pageId} />;
}
