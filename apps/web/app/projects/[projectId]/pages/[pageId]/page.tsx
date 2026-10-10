import { PageEditor } from '@/domain/projects';

interface PageEditorPageProps {
  params: { projectId: string; pageId: string };
}

export default function PageEditorPage({ params }: PageEditorPageProps) {
  return <PageEditor key={params.pageId} pageId={params.pageId} />;
}
