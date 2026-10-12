import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { findSampleProject } from '@wisepath/domain/projects';

interface ProjectLayoutProps {
  children: ReactNode;
  params: Promise<{ projectId: string }>;
}

export default async function ProjectLayout({ children, params }: ProjectLayoutProps) {
  const { projectId } = await params;
  if (!findSampleProject(projectId)) notFound();
  return children;
}
