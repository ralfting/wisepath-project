import type { Metadata } from 'next';
import { ProjectMap } from '@/features/map';

interface ProjectPageProps {
  params: Promise<{ projectId: string }>;
}

// The map loads in the browser, so the server can't name it yet
export const metadata: Metadata = { title: 'Path | WisePath' };

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  return <ProjectMap projectId={projectId} />;
}
