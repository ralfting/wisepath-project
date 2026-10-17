'use client';

import { useState } from 'react';
import { Button, Group, Modal, Text } from '@mantine/core';
import type { PathSummary } from '@wisepath/domain/paths';
import { useRemovePath } from '@/useCases/paths';
import { useT } from '@/i18n/I18nProvider';

/** Asks before deleting a path and its pages, which can't be undone */
export function DeleteMapModal({ opened, path, onClose }: { opened: boolean; path: PathSummary; onClose: () => void }) {
  const remove = useRemovePath();
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    const message = await remove(path.id);
    setBusy(false);
    if (message) return setError(message);
    onClose();
  };

  return (
    <Modal opened={opened} onClose={onClose} title={t('home.delete.title')} centered radius="lg" size="md" closeButtonProps={{ 'aria-label': t('common.actions.close') }}>
      <Text size="sm">
        <b>{path.title}</b> {t('home.delete.body', { count: path.total + 1 })}
      </Text>
      {error && (
        <Text size="sm" c="red.7" mt="sm">
          {error}
        </Text>
      )}
      <Group justify="flex-end" gap="sm" mt="lg">
        <Button variant="default" onClick={onClose} data-autofocus>
          {t('home.delete.keep')}
        </Button>
        <Button color="red" onClick={confirm} loading={busy}>
          {t('home.delete.confirm')}
        </Button>
      </Group>
    </Modal>
  );
}
