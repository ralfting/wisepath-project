'use client';

import { useState } from 'react';
import { useWindowEvent } from '@mantine/hooks';
import { ActionIcon, ColorSwatch, Group, Popover, SimpleGrid, Stack, Switch, Text, Textarea, ThemeIcon, Tooltip, UnstyledButton } from '@mantine/core';
import { IconCheck, IconPencil } from '@tabler/icons-react';
import type { Page, Project } from '@wisepath/domain/projects';
import { PageColor, PageIcon, lookOf } from '@wisepath/domain/projects';
import type { ProjectActions } from '@/useCases/projects';
import { PageGlyph, shade } from '@/features/shared/look';
import classes from './PageLook.module.css';

/**
 * PageLook
 * The page's icon, which is also where its look changes: a click opens
 * whether it shows as a module, its colour and icon (and, for the path's
 * main page, its description). Like a page icon in Notion, the setting sits
 * on the thing it changes.
 */
export function PageLook({ project, page, store, size }: { project: Project; page: Page; store: ProjectActions; size: number }) {
  const [opened, setOpened] = useState(false);
  // Esc closes the panel wherever focus is (a click on a swatch may leave it on the page)
  useWindowEvent('keydown', (event) => {
    if (opened && event.key === 'Escape') setOpened(false);
  });
  const isRoot = page.id === project.rootPageId;
  const look = lookOf(project, page.id);
  const label = isRoot ? 'Change the look and description' : 'Change the look';

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
        <LookFields project={project} page={page} store={store} />
      </Popover.Dropdown>
    </Popover>
  );
}

/**
 * Module or plain page, colour and icon; the main page has a description instead of the module switch.
 * Every control is marked so Esc closes this panel only, not the drawer around it (Mantine skips Esc from them).
 */
function LookFields({ project, page, store }: { project: Project; page: Page; store: ProjectActions }) {
  const isRoot = page.id === project.rootPageId;
  const look = lookOf(project, page.id);
  const styled = isRoot || !!page.module;

  return (
    <Stack gap="md">
      {isRoot ? (
        <Textarea
          label="Description"
          description="One line under the path's title."
          autosize
          minRows={2}
          value={project.description ?? ''}
          onChange={(e) => store.setDescription(e.currentTarget.value)}
          data-autofocus
          data-mantine-stop-propagation
        />
      ) : (
        <Switch
          label="Show as a module"
          description="Drawn larger on the map, with its own colour and icon; pages below it take the colour."
          checked={!!page.module}
          onChange={(e) => store.setLook(page.id, moduleLook(project, page, e.currentTarget.checked))}
          data-autofocus
          data-mantine-stop-propagation
        />
      )}
      {styled && (
        <>
          <Stack gap={6}>
            <Text size="sm" fw={500}>
              Colour
            </Text>
            <Group gap={8}>
              {PageColor.literals.map((color) => (
                <ColorSwatch
                  key={color}
                  component="button"
                  type="button"
                  color={shade(color, 6)}
                  size={24}
                  aria-label={color}
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
              Icon
            </Text>
            <SimpleGrid cols={7} spacing={6}>
              {PageIcon.literals.map((icon) => (
                <ActionIcon
                  key={icon}
                  size={32}
                  radius="md"
                  variant={look.icon === icon ? 'light' : 'default'}
                  color={look.color}
                  aria-label={icon}
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
export function moduleLook(project: Project, page: Page, module: boolean) {
  const look = lookOf(project, page.id);
  return module ? { module: true, color: look.color, icon: page.icon ?? look.icon } : { module: false };
}
