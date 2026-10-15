import type { Metadata } from 'next';
import { ProjectMap } from '@/features/map';
import { serverT } from '@/i18n/server';

interface ProjectPageProps {
  params: Promise<{ projectId: string }>;
}

// The map loads in the browser, so the server can't name it yet
export async function generateMetadata(): Promise<Metadata> {
  const t = await serverT();
  return { title: t('home.meta.path') };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  return <ProjectMap projectId={projectId} />;
}
