import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { ProjectStoreProvider, getSampleProject } from '@/domain/projects';

interface ProjectLayoutProps {
  children: ReactNode;
  params: Promise<{ projectId: string }>;
}

export default async function ProjectLayout({ children, params }: ProjectLayoutProps) {
  const { projectId } = await params;
  const project = getSampleProject(projectId);
  if (!project) notFound();

  return <ProjectStoreProvider initialProject={project}>{children}</ProjectStoreProvider>;
}
