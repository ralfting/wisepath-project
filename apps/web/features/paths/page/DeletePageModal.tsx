'use client';

import { Button, Group, Modal, Text } from '@mantine/core';
import { useT } from '@/i18n/I18nProvider';

/**
 * DeletePageModal
 * Asks before a page is deleted and says what happens to what pointed at it.
 */
export function DeletePageModal({
  opened,
  title,
  orphansPages,
  onClose,
  onDelete,
}: {
  opened: boolean;
  title: string;
  /** The page has branches, which may become orphans */
  orphansPages: boolean;
  onClose: () => void;
  onDelete: () => void;
}) {
  const t = useT();
  return (
    <Modal opened={opened} onClose={onClose} title={t('page.delete.title')} centered radius="lg" size="md" closeButtonProps={{ 'aria-label': t('common.actions.close') }}>
      <Text size="sm">
        <b>{title}</b> {t(orphansPages ? 'page.delete.bodyWithOrphans' : 'page.delete.body')}
      </Text>
      <Group justify="flex-end" gap="sm" mt="lg">
        <Button variant="default" onClick={onClose} data-autofocus>
          {t('page.delete.keep')}
        </Button>
        <Button color="red" onClick={onDelete}>
          {t('page.delete.confirm')}
        </Button>
      </Group>
    </Modal>
  );
}
