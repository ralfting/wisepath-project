'use client';

import Link from 'next/link';
import { Anchor, Breadcrumbs, Text } from '@mantine/core';
import { IconChevronRight } from '@tabler/icons-react';
import classes from './AppFrame.module.css';
import type { Crumb } from './AppFrame.helpers';

/** The breadcrumbs of the top bar */
export function CrumbTrail({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <Breadcrumbs separator={<IconChevronRight size={12} />} separatorMargin={6} className={classes.crumbs} visibleFrom="xs">
      {/* Quiet: small and grey, each crumb cut short; the page shows its own title in full */}
      {crumbs.map((c, i) =>
        c.href ? (
          <Anchor key={i} component={Link} href={c.href} size="xs" c="dimmed" truncate className={classes.crumb}>
            {c.label}
          </Anchor>
        ) : (
          <Text key={i} size="xs" c="dimmed" fw={500} aria-current="page" truncate className={classes.crumb}>
            {c.label}
          </Text>
        ),
      )}
    </Breadcrumbs>
  );
}
