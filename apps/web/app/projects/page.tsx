import type { Metadata } from 'next';
import { ProjectsHome } from '@/features/projects';
import { serverT } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await serverT();
  return { title: t('home.meta.projects') };
}

export default function ProjectsPage() {
  return <ProjectsHome />;
}
