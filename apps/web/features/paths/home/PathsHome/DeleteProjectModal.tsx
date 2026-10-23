'use client';

import { useState } from 'react';
import { Button, Group, Modal, Text } from '@mantine/core';
import type { Project } from '@wisepath/domain/projects';
import { useRemoveProject } from '@/useCases/projects';
import { useT } from '@/i18n/I18nProvider';

/** Deletes a project after saying where its paths go */
export function DeleteProjectModal({
  opened,
  project,
  paths,
  fallback,
  onClose,
}: {
  opened: boolean;
  project: Project;
  /** How many paths it holds */
  paths: number;
  /** The default project, which takes them */
  fallback: string;
  onClose: () => void;
}) {
  const remove = useRemoveProject();
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    const message = await remove(project.id);
    setBusy(false);
    if (message) return setError(message);
    onClose();
  };

  return (
    <Modal opened={opened} onClose={onClose} title={t('home.projectDelete.title')} centered radius="lg" size="md" closeButtonProps={{ 'aria-label': t('common.actions.close') }}>
      <Text size="sm">
        <b>{project.name}</b> · {paths > 0 ? t('home.projectDelete.body', { count: paths, fallback }) : t('home.projectDelete.empty')}
      </Text>
      {error && (
        <Text size="sm" c="red" mt="sm">
          {error}
        </Text>
      )}
      <Group justify="flex-end" gap="sm" mt="lg">
        <Button variant="default" onClick={onClose} data-autofocus>
          {t('home.projectDelete.keep')}
        </Button>
        <Button color="red" onClick={confirm} loading={busy}>
          {t('home.projectDelete.confirm')}
        </Button>
      </Group>
    </Modal>
  );
}
