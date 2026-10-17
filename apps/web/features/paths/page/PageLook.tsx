'use client';

import { useState } from 'react';
import { useWindowEvent } from '@mantine/hooks';
import { ActionIcon, ColorSwatch, Group, Popover, SimpleGrid, Stack, Switch, Text, Textarea, ThemeIcon, Tooltip, UnstyledButton } from '@mantine/core';
import { IconCheck, IconPencil } from '@tabler/icons-react';
import type { Page, Path } from '@wisepath/domain/paths';
import { PageColor, PageIcon, lookOf } from '@wisepath/domain/paths';
import type { PathActions } from '@/useCases/paths';
import { PageGlyph, shade } from '@/features/paths/path';
import { useT } from '@/i18n/I18nProvider';
import classes from './PageLook.module.css';

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

/**
 * Module or plain page, colour and icon; the main page has a description instead of the module switch.
 * Every control is marked so Esc closes this panel only, not the drawer around it (Mantine skips Esc from them).
 */
function LookFields({ path, page, store }: { path: Path; page: Page; store: PathActions }) {
  const isRoot = page.id === path.rootPageId;
  const look = lookOf(path, page.id);
  const styled = isRoot || !!page.module;
  const t = useT();

  return (
    <Stack gap="md">
      {isRoot ? (
        <Textarea
          label={t('page.look.description.label')}
          description={t('page.look.description.hint')}
          autosize
          minRows={2}
          value={path.description ?? ''}
          onChange={(e) => store.setDescription(e.currentTarget.value)}
          data-autofocus
          data-mantine-stop-propagation
        />
      ) : (
        <Switch
          label={t('page.look.module.label')}
          description={t('page.look.module.hint')}
          checked={!!page.module}
          onChange={(e) => store.setLook(page.id, moduleLook(path, page, e.currentTarget.checked))}
          data-autofocus
          data-mantine-stop-propagation
        />
      )}
      {styled && (
        <>
          <Stack gap={6}>
            <Text size="sm" fw={500}>
              {t('page.look.colour')}
            </Text>
            <Group gap={8}>
              {PageColor.literals.map((color) => (
                <ColorSwatch
                  key={color}
                  component="button"
                  type="button"
                  color={shade(color, 6)}
                  size={24}
                  aria-label={t(`page.look.colours.${color}`)}
                  aria-pressed={look.color === color}
                  onClick={() => store.setLook(page.id, { color })}
                  className={classes.swatch}
                  data-mantine-stop-propagation
                >
                  {look.color === color && <IconCheck size={13} color="white" stroke={3} />}
                </ColorSwatch>
              ))}
            </Group>
          </Stack>
          <Stack gap={6}>
            <Text size="sm" fw={500}>
              {t('page.look.icon')}
            </Text>
            <SimpleGrid cols={7} spacing={6}>
              {PageIcon.literals.map((icon) => (
                <ActionIcon
                  key={icon}
                  size={32}
                  radius="md"
                  variant={look.icon === icon ? 'light' : 'default'}
                  color={look.color}
                  aria-label={t(`page.look.icons.${icon}`)}
                  aria-pressed={look.icon === icon}
                  onClick={() => store.setLook(page.id, { icon })}
                  data-mantine-stop-propagation
                >
                  <PageGlyph icon={icon} size={17} />
                </ActionIcon>
              ))}
            </SimpleGrid>
          </Stack>
        </>
      )}
    </Stack>
  );
}

/** The look for turning a page into a module (keeping the colour and icon it shows now) or back */
export function moduleLook(path: Path, page: Page, module: boolean) {
  const look = lookOf(path, page.id);
  return module ? { module: true, color: look.color, icon: page.icon ?? look.icon } : { module: false };
}
