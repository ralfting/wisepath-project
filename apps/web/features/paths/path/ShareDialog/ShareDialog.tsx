'use client';

import { Divider, Modal, Stack } from '@mantine/core';
import type { Path } from '@wisepath/domain/paths';
import { useT } from '@/i18n/I18nProvider';
import { CatalogSection } from './CatalogSection';
import { LinkSection } from './LinkSection';
import { PeopleSection } from './PeopleSection';

/**
 * The owner's Share dialog: whether anyone with the link can read the path, whether it is in the catalog, and the
 * people it is shared with, to read or to edit. Each person studies with their own progress; nobody sees another's.
 */
export function ShareDialog({ path, opened, onClose }: { path: Path; opened: boolean; onClose: () => void }) {
  const t = useT();
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t('share.title', { title: path.title })}
      centered
      radius="lg"
      size="md"
      closeButtonProps={{ 'aria-label': t('common.actions.close') }}
    >
      {/* Mounted on each opening, so the email field starts empty every time */}
      <Stack gap="lg">
        <LinkSection path={path} />
        <Divider />
        <CatalogSection path={path} />
        <Divider />
        <PeopleSection pathId={path.id} />
      </Stack>
    </Modal>
  );
}
