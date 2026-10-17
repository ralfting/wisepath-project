'use client';

import { Modal } from '@mantine/core';
import type { Project } from '@wisepath/domain/projects';
import { useT } from '@/i18n/I18nProvider';
import { ProjectNameForm } from './ProjectNameForm';

/** Names a new project, or renames `project` when given */
export function ProjectNameModal({ opened, project, onClose }: { opened: boolean; project?: Project; onClose: () => void }) {
  const t = useT();
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t(project ? 'home.projectForm.renameTitle' : 'home.projectForm.createTitle')}
      centered
      radius="lg"
      size="sm"
      closeButtonProps={{ 'aria-label': t('common.actions.close') }}
    >
      {/* The modal mounts its content on each opening, so the form starts from the project's name every time */}
      <ProjectNameForm project={project} onDone={onClose} />
    </Modal>
  );
}
