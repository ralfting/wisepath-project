'use client';

import { useState } from 'react';
import { Button, Group, Modal, Text } from '@mantine/core';
import type { PathSummary } from '@wisepath/domain/paths';
import { useLeavePath } from '@/useCases/paths';
import { showToast } from '@/features/inbox/capture';
import { useT } from '@/i18n/I18nProvider';

/**
 * Asks before a path from others leaves the learner's paths: what was theirs on it (marks, ticks, answers, notes)
 * goes with it and can't come back, and getting the path again depends on whether it is still public.
 */
export function LeavePathModal({ opened, path, onClose }: { opened: boolean; path: PathSummary; onClose: () => void }) {
  const leave = useLeavePath();
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    const failed = await leave(path.id);
    setBusy(false);
    if (failed) return setError(`${t('share.from.leaveFailed', { title: path.title })} ${failed}`);
    onClose();
    showToast({ text: t('share.from.left', { title: path.title }) });
  };

  return (
    <Modal opened={opened} onClose={onClose} title={t('share.from.leaveTitle')} centered radius="lg" size="md" closeButtonProps={{ 'aria-label': t('common.actions.close') }}>
      <Text size="sm">{t('share.from.leaveBody', { title: path.title })}</Text>
      <Text size="sm" mt="sm">
        {t(path.visibility === 'private' ? 'share.from.leaveAgainInvited' : 'share.from.leaveAgainPublic')}
      </Text>
      {error && (
        <Text size="sm" c="red" mt="sm">
          {error}
        </Text>
      )}
      <Group justify="flex-end" gap="sm" mt="lg">
        <Button variant="default" onClick={onClose} data-autofocus>
          {t('share.from.leaveKeep')}
        </Button>
        <Button color="red" onClick={() => void handleConfirm()} loading={busy}>
          {t('share.from.leaveConfirm')}
        </Button>
      </Group>
    </Modal>
  );
}
