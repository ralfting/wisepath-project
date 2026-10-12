import type { Metadata } from 'next';
import { findSampleProject } from '@wisepath/domain/projects';
import { ProjectMap } from '@/features/map';

interface ProjectPageProps {
  params: Promise<{ projectId: string }>;
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const project = findSampleProject((await params).projectId);
  return { title: project ? `${project.title} | WisePath` : 'WisePath' };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  return <ProjectMap projectId={projectId} />;
}
