'use client';

import { Button, Group, Modal, Text } from '@mantine/core';

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
  return (
    <Modal opened={opened} onClose={onClose} title="Delete page?" centered radius="lg" size="md">
      <Text size="sm">
        <b>{title}</b> will be deleted. Links to it stay in other pages and show as missing
        {orphansPages ? ', and pages only it reaches become orphans' : ''}. This can&apos;t be undone.
      </Text>
      <Group justify="flex-end" gap="sm" mt="lg">
        <Button variant="default" onClick={onClose} data-autofocus>
          Keep it
        </Button>
        <Button color="red" onClick={onDelete}>
          Delete page
        </Button>
      </Group>
    </Modal>
  );
}
