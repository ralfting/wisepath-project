import type { ReactNode } from 'react';
import { PageDrawerShell } from '@/features/page';

/** Stays mounted while the learner moves between pages, so the drawer does not slide in again */
export default function PageDrawerLayout({ children }: { children: ReactNode }) {
  return <PageDrawerShell>{children}</PageDrawerShell>;
}
