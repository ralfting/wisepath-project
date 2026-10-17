'use client';

import { Modal } from '@mantine/core';
import type { Project } from '@wisepath/domain/projects';
import { useT } from '@/i18n/I18nProvider';
import { NewMapForm } from './NewMapForm';

/**
 * Names a new map, which starts as its root page, files it in a project (the
 * one it was opened from) and says what it is for: a study unless chosen otherwise
 */
export function NewMapModal({
  opened,
  projectId,
  projects,
  onClose,
}: {
  opened: boolean;
  projectId: string | null;
  projects: ReadonlyArray<Project>;
  onClose: () => void;
}) {
  const t = useT();
  return (
    <Modal opened={opened} onClose={onClose} title={t('home.create.title')} centered radius="lg" size="md" closeButtonProps={{ 'aria-label': t('common.actions.close') }}>
      {/* The modal mounts its content on each opening, so the form starts empty, on the project it was opened from */}
      <NewMapForm projectId={projectId} projects={projects} onDone={onClose} />
    </Modal>
  );
}
