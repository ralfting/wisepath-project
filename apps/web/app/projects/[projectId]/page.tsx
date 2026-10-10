import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProjectView, getSampleProject } from '@/domain/projects';

interface ProjectPageProps {
  params: { projectId: string };
}

export function generateMetadata({ params }: ProjectPageProps): Metadata {
  const project = getSampleProject(params.projectId);
  return { title: project ? `${project.title} · WisePath` : 'Project not found · WisePath' };
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const project = getSampleProject(params.projectId);
  if (!project) notFound();

  return <ProjectView project={project} />;
}
