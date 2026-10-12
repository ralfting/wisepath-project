import type { Metadata } from 'next';
import { ProjectMap, getSampleProject } from '@/domain/projects';

interface ProjectPageProps {
  params: Promise<{ projectId: string }>;
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const project = getSampleProject((await params).projectId);
  return { title: project ? `${project.title} | WisePath` : 'WisePath' };
}

export default function ProjectPage() {
  return <ProjectMap />;
}
