import type { Metadata } from 'next';
import { ProjectMap, getSampleProject } from '@/domain/projects';

interface ProjectPageProps {
  params: { projectId: string };
}

export function generateMetadata({ params }: ProjectPageProps): Metadata {
  const project = getSampleProject(params.projectId);
  return { title: project ? `${project.title} | WisePath` : 'WisePath' };
}

export default function ProjectPage() {
  return <ProjectMap />;
}
