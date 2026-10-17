'use client';

import { ActionIcon, ColorSwatch, Group, SimpleGrid, Stack, Switch, Text, Textarea } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import type { Page, Path } from '@wisepath/domain/paths';
import { PageColor, PageIcon, lookOf } from '@wisepath/domain/paths';
import type { PathActions } from '@/useCases/paths';
import { PageGlyph, shade } from '@/features/paths/path';
import { useT } from '@/i18n/I18nProvider';
import classes from './PageLook.module.css';
import { moduleLook } from './PageLook.helpers';

/**
 * Module or plain page, colour and icon; the main page has a description instead of the module switch.
 * Every control is marked so Esc closes this panel only, not the drawer around it (Mantine skips Esc from them).
 */
export function LookFields({ path, page, store }: { path: Path; page: Page; store: PathActions }) {
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
