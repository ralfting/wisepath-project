import { PageEditor } from '@/features/page';

interface PageEditorPageProps {
  params: Promise<{ projectId: string; pageId: string }>;
}

export default async function PageEditorPage({ params }: PageEditorPageProps) {
  const { projectId, pageId } = await params;
  return <PageEditor key={pageId} projectId={projectId} pageId={pageId} />;
}
