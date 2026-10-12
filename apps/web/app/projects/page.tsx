import type { Metadata } from 'next';
import { ProjectsHome } from '@/features/projects';

export const metadata: Metadata = { title: 'Your projects | WisePath' };

export default function ProjectsPage() {
  return <ProjectsHome />;
}
