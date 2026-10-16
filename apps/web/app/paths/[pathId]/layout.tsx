import type { ReactNode } from 'react';

interface PathLayoutProps {
  children: ReactNode;
  /** A page opened from the map, in a drawer over it (see @drawer) */
  drawer: ReactNode;
  params: Promise<{ pathId: string }>;
}

/** Maps load in the browser (see PathGate), which shows not-found for an unknown id */
export default async function PathLayout({ children, drawer }: PathLayoutProps) {
  return (
    <>
      {children}
      {drawer}
    </>
  );
}
