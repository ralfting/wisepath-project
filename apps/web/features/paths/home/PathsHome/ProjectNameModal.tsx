'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Button, Group, Modal, TextInput } from '@mantine/core';
import type { Project } from '@wisepath/domain/projects';
import { useCreateProject, useRenameProject } from '@/useCases/projects';
import { useT } from '@/i18n/I18nProvider';

/**
 * ProjectModals
 * Naming a project (a new one, or renaming one) and deleting one, whose paths
 * move to the default project.
 */

/** Names a new project, or renames `project` when given */
export function ProjectNameModal({ opened, project, onClose }: { opened: boolean; project?: Project; onClose: () => void }) {
  const create = useCreateProject();
  const rename = useRenameProject();
  const t = useT();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Opens with the current name when renaming
  useEffect(() => {
    if (opened) setName(project?.name ?? '');
  }, [opened, project]);

  const close = () => {
    setName('');
    setError(null);
    onClose();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return setError(t('home.projectForm.nameRequired'));
    setBusy(true);
    const message = project ? await rename(project.id, name) : await create(name).then((r) => (r.ok ? null : r.message));
    setBusy(false);
    if (message) return setError(message);
    close();
  };

  return (
    <Modal
      opened={opened}
      onClose={close}
      title={t(project ? 'home.projectForm.renameTitle' : 'home.projectForm.createTitle')}
      centered
      radius="lg"
      size="sm"
      closeButtonProps={{ 'aria-label': t('common.actions.close') }}
    >
      <form onSubmit={submit} noValidate>
        <TextInput
          label={t('home.projectForm.name')}
          placeholder={t('home.projectForm.namePlaceholder')}
          value={name}
          onChange={(e) => {
            setName(e.currentTarget.value);
            setError(null);
          }}
          error={error}
          maxLength={100}
          data-autofocus
        />
        <Group justify="flex-end" gap="sm" mt="lg">
          <Button variant="default" onClick={close}>
            {t('common.actions.cancel')}
          </Button>
          <Button type="submit" loading={busy}>
            {t(project ? 'home.projectForm.save' : 'home.projectForm.create')}
          </Button>
        </Group>
      </form>
    </Modal>
  );
}
