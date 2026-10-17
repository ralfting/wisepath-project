'use client';

import type { ReactNode } from 'react';
import { Group } from '@mantine/core';
import classes from './AppFrame.module.css';

/** A top bar like the frame's, for content that draws its own (the expanded page drawer) */
export function TopBar({ children }: { children: ReactNode }) {
  return (
    <Group component="header" className={classes.topbar} gap="md" wrap="nowrap">
      {children}
    </Group>
  );
}
