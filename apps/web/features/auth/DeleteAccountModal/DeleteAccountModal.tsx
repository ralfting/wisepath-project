'use client';

import { Modal } from '@mantine/core';
import { useT } from '@/i18n/I18nProvider';
import { DeleteAccountForm } from './DeleteAccountForm';

/** Asks for the password before deleting the account and all it owns, offering to download the paths first */
export function DeleteAccountModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const t = useT();
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t('auth.deleteAccount.title')}
      centered
      radius="lg"
      size="md"
      closeButtonProps={{ 'aria-label': t('common.actions.close') }}
    >
      <DeleteAccountForm onCancel={onClose} />
    </Modal>
  );
}
