import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { readablePath } from '@/useCases/paths/queries';

interface PathLayoutProps {
  children: ReactNode;
  /** A page opened from the map, in a drawer over it (see @drawer) */
  drawer: ReactNode;
  params: Promise<{ pathId: string }>;
}

/**
 * A map the learner may not read answers 404 from the server, before anything streams. The map itself still loads
 * in the browser (PathGate), which also catches one removed while it is open.
 */
export default async function PathLayout({ children, drawer, params }: PathLayoutProps) {
  const { pathId } = await params;
  if ((await readablePath(pathId)).status === 'missing') notFound();
  return (
    <>
      {children}
      {drawer}
    </>
  );
}
