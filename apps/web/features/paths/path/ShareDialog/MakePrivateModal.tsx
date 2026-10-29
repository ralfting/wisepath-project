'use client';

import { Button, Group, Modal, Text } from '@mantine/core';
import type { CatalogState } from '@/useCases/paths';
import { useT } from '@/i18n/I18nProvider';
import type { TranslationKey } from '@/i18n/I18nProvider';

/** What making the path private also does to its place in the catalog, by where it stands there */
const CATALOG_LOSS: Record<CatalogState, TranslationKey | null> = {
  none: null,
  declined: null,
  pending: 'share.link.privateWithdraws',
  published: 'share.link.privateUnpublishes',
};

interface MakePrivateModalProps {
  readonly opened: boolean;
  readonly catalog: CatalogState;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
}

/** Asks before a public path goes private, saying who loses it and what happens to its catalog request */
export function MakePrivateModal({ opened, catalog, onClose, onConfirm }: MakePrivateModalProps) {
  const t = useT();
  const loss = CATALOG_LOSS[catalog];
  return (
    <Modal opened={opened} onClose={onClose} title={t('share.link.privateTitle')} centered radius="lg" size="md" closeButtonProps={{ 'aria-label': t('common.actions.close') }}>
      <Text size="sm">{t('share.link.privateBody')}</Text>
      {loss && (
        <Text size="sm" mt="sm">
          {t(loss)}
        </Text>
      )}
      <Group justify="flex-end" gap="sm" mt="lg">
        <Button variant="default" onClick={onClose} data-autofocus>
          {t('share.link.privateKeep')}
        </Button>
        <Button color="red" onClick={onConfirm}>
          {t('share.link.privateConfirm')}
        </Button>
      </Group>
    </Modal>
  );
}
