'use client';

import { Button, Group, Radio, Select, Stack, Text, TextInput, ThemeIcon } from '@mantine/core';
import type { PathKind } from '@wisepath/domain/paths';
import type { Project } from '@wisepath/domain/projects';
import { KIND_OPTIONS } from '@/features/paths/path';
import { useT } from '@/i18n/I18nProvider';
import classes from '../PathsHome.module.css';
import { useNewMapForm } from './useNewMapForm';

/** The new map's name, its project, its kind, and the buttons that make it or cancel */
export function NewMapForm({ projectId, projects, onDone }: { projectId: string | null; projects: ReadonlyArray<Project>; onDone: () => void }) {
  const t = useT();
  const { state, operations } = useNewMapForm({ projectId, onDone });
  return (
    <form onSubmit={operations.submit} noValidate>
      <TextInput
        label={t('home.create.name')}
        description={t('home.create.nameHint')}
        placeholder={t('home.create.namePlaceholder')}
        value={state.title}
        onChange={(event) => operations.changeTitle(event.currentTarget.value)}
        error={state.error}
        maxLength={200}
        data-autofocus
      />
      <Select
        label={t('home.create.project')}
        data={projects.map((p) => ({ value: p.id, label: p.name }))}
        value={state.project}
        onChange={operations.setProject}
        allowDeselect={false}
        comboboxProps={{ withinPortal: false }}
        mt="lg"
      />
      <Radio.Group value={state.kind} onChange={(value) => operations.setKind(value as PathKind)} label={t('home.create.kind')} description={t('home.create.kindHint')} mt="lg">
        <Stack gap="xs" mt="xs">
          {KIND_OPTIONS.map((option) => (
            <Radio.Card key={option.value} value={option.value} radius="md" p="sm" className={classes.kindCard}>
              <Group wrap="nowrap" align="flex-start" gap="sm">
                <Radio.Indicator mt={2} />
                <ThemeIcon variant="light" color={option.color} radius="md" size={34}>
                  <option.icon size={19} />
                </ThemeIcon>
                <div>
                  <Text fw={600} size="sm">
                    {t(option.label)}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {t(option.hint)}
                  </Text>
                </div>
              </Group>
            </Radio.Card>
          ))}
        </Stack>
      </Radio.Group>
      <Group justify="flex-end" gap="sm" mt="lg">
        <Button variant="default" onClick={operations.cancel}>
          {t('common.actions.cancel')}
        </Button>
        <Button type="submit" loading={state.busy}>
          {t('home.create.submit')}
        </Button>
      </Group>
    </form>
  );
}
