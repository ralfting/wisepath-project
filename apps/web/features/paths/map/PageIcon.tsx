'use client';

import { IconBook2 } from '@tabler/icons-react';

/** A page in a study, which has no status to show: the page itself */
export function PageIcon({ size = 18 }: { size?: number }) {
  return <IconBook2 size={size} stroke={1.7} color="var(--mantine-color-dimmed)" aria-hidden="true" />;
}
