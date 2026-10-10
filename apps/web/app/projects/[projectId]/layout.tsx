import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { ProjectStoreProvider, getSampleProject } from '@/domain/projects';

interface ProjectLayoutProps {
  children: ReactNode;
  params: { projectId: string };
}

export default function ProjectLayout({ children, params }: ProjectLayoutProps) {
  const project = getSampleProject(params.projectId);
  if (!project) notFound();

  return <ProjectStoreProvider initialProject={project}>{children}</ProjectStoreProvider>;
}
