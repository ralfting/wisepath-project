import type { ReactNode } from 'react';

interface ProjectLayoutProps {
  children: ReactNode;
  /** A page opened from the map, in a drawer over it (see @drawer) */
  drawer: ReactNode;
  params: Promise<{ projectId: string }>;
}

/** Maps load in the browser (see ProjectGate), which shows not-found for an unknown id */
export default async function ProjectLayout({ children, drawer }: ProjectLayoutProps) {
  return (
    <>
      {children}
      {drawer}
    </>
  );
}
