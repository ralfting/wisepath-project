'use client';

import { useState } from 'react';
import { useWindowEvent } from '@mantine/hooks';
import { Popover, ThemeIcon, Tooltip, UnstyledButton } from '@mantine/core';
import { IconPencil } from '@tabler/icons-react';
import type { Page, Path } from '@wisepath/domain/paths';
import { lookOf } from '@wisepath/domain/paths';
import type { PathActions } from '@/useCases/paths';
import { PageGlyph } from '@/features/paths/path';
import { useT } from '@/i18n/I18nProvider';
import classes from './PageLook.module.css';
import { LookFields } from './LookFields';

/**
 * PageLook
 * The page's icon, which is also where its look changes: a click opens
 * whether it shows as a module, its colour and icon (and, for the path's
 * main page, its description). Like a page icon in Notion, the setting sits
 * on the thing it changes.
 */
export function PageLook({ path, page, store, size }: { path: Path; page: Page; store: PathActions; size: number }) {
  const t = useT();
  const [opened, setOpened] = useState(false);
  // Esc closes the panel wherever focus is (a click on a swatch may leave it on the page)
  useWindowEvent('keydown', (event) => {
    if (opened && event.key === 'Escape') setOpened(false);
  });
  const isRoot = page.id === path.rootPageId;
  const look = lookOf(path, page.id);
  const label = t(isRoot ? 'page.look.changeWithDescription' : 'page.look.change');

  return (
    <Popover opened={opened} onChange={setOpened} position="bottom-start" shadow="md" radius="md" width={300} trapFocus>
      <Popover.Target>
        <Tooltip label={label} disabled={opened}>
          <UnstyledButton
            onClick={() => setOpened((o) => !o)}
            aria-label={label}
            aria-expanded={opened}
            className={classes.target}
            data-mantine-stop-propagation={opened || undefined}
          >
            <ThemeIcon size={size} radius="xl" variant="light" color={look.color}>
              <PageGlyph icon={isRoot || page.module ? look.icon : 'book'} size={Math.round(size / 2)} />
            </ThemeIcon>
            <span className={classes.badge} aria-hidden="true">
              <IconPencil size={11} stroke={2.2} />
            </span>
          </UnstyledButton>
        </Tooltip>
      </Popover.Target>
      <Popover.Dropdown>
        <LookFields path={path} page={page} store={store} />
      </Popover.Dropdown>
    </Popover>
  );
}
