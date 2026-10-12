import type { Metadata } from 'next';
import { ProjectsHome, sampleProject } from '@/domain/projects';

export const metadata: Metadata = { title: 'Your projects | WisePath' };

export default function ProjectsPage() {
  return <ProjectsHome projects={[sampleProject]} />;
}
