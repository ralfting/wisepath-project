import { PageEditor } from '@/domain/projects';

interface PageEditorPageProps {
  params: Promise<{ projectId: string; pageId: string }>;
}

export default async function PageEditorPage({ params }: PageEditorPageProps) {
  const { pageId } = await params;
  return <PageEditor key={pageId} pageId={pageId} />;
}
