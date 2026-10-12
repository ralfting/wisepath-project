import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { findSampleProject } from '@wisepath/domain/projects';

interface ProjectLayoutProps {
  children: ReactNode;
  /** A page opened from the map, in a drawer over it (see @drawer) */
  drawer: ReactNode;
  params: Promise<{ projectId: string }>;
}

export default async function ProjectLayout({ children, drawer, params }: ProjectLayoutProps) {
  const { projectId } = await params;
  if (!findSampleProject(projectId)) notFound();
  return (
    <>
      {children}
      {drawer}
    </>
  );
}
