'use client';

import { Button, Group, TextInput } from '@mantine/core';
import type { Project } from '@wisepath/domain/projects';
import { useT } from '@/i18n/I18nProvider';
import { useProjectNameForm } from './useProjectNameForm';

/** The project's name, and the buttons that save or cancel it */
export function ProjectNameForm({ project, onDone }: { project?: Project; onDone: () => void }) {
  const t = useT();
  const { state, operations } = useProjectNameForm({ project, onDone });
  return (
    <form onSubmit={operations.submit} noValidate>
      <TextInput
        label={t('home.projectForm.name')}
        placeholder={t('home.projectForm.namePlaceholder')}
        value={state.name}
        onChange={(event) => operations.changeName(event.currentTarget.value)}
        error={state.error}
        maxLength={100}
        data-autofocus
      />
      <Group justify="flex-end" gap="sm" mt="lg">
        <Button variant="default" onClick={operations.cancel}>
          {t('common.actions.cancel')}
        </Button>
        <Button type="submit" loading={state.busy}>
          {t(state.renaming ? 'home.projectForm.save' : 'home.projectForm.create')}
        </Button>
      </Group>
    </form>
  );
}
