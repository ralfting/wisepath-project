'use client';

import { Button, Group, Select, TextInput } from '@mantine/core';
import { IconFolder } from '@tabler/icons-react';
import type { Project } from '@wisepath/domain/projects';
import { useT } from '@/i18n/I18nProvider';
import { useNewMapForm } from './useNewMapForm';

/** The new map's name, its project, and the buttons that make it or cancel; it starts as a study */
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
        leftSection={<IconFolder size={16} />}
        allowDeselect={false}
        comboboxProps={{ withinPortal: false }}
        mt="lg"
      />
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
