import { PageEditor } from '@/features/page';

interface PageEditorPageProps {
  params: Promise<{ pathId: string; pageId: string }>;
}

export default async function PageEditorPage({ params }: PageEditorPageProps) {
  const { pathId, pageId } = await params;
  return <PageEditor key={pageId} pathId={pathId} pageId={pageId} />;
}
