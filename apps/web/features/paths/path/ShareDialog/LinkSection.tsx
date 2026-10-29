'use client';

import { useState } from 'react';
import { Button, CopyButton, Group, Stack, Switch, Text } from '@mantine/core';
import { IconCheck, IconLink } from '@tabler/icons-react';
import type { Path } from '@wisepath/domain/paths';
import { useCatalog, useSetVisibility, useVisibility } from '@/useCases/paths';
import { catalogHref, publicMapHref } from '@/shared/routes';
import { useT } from '@/i18n/I18nProvider';
import { MakePrivateModal } from './MakePrivateModal';

/** Private or readable by anyone with the link, and the link to copy once it is public; going private asks first */
export function LinkSection({ path }: { path: Path }) {
  const t = useT();
  const visibility = useVisibility(path);
  const setVisibility = useSetVisibility();
  const catalog = useCatalog(path);
  const [confirmingPrivate, setConfirmingPrivate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // A published path is readable by its link too
  const isPublic = visibility !== 'private';
  // A published path is shared by its catalog address once it has one
  const href = visibility === 'published' && path.slug ? catalogHref(path.slug) : publicMapHref(path.id);

  const change = async (makePublic: boolean) => {
    setBusy(true);
    setError(await setVisibility(path.id, makePublic ? 'public' : 'private'));
    setBusy(false);
  };

  const handleChange = (makePublic: boolean) => (makePublic ? void change(true) : setConfirmingPrivate(true));

  const handleConfirmPrivate = () => {
    setConfirmingPrivate(false);
    void change(false);
  };

  return (
    <Stack gap="xs">
      <Text fw={700} size="sm">
        {t('share.link.label')}
      </Text>
      <Switch
        checked={isPublic}
        disabled={busy}
        onChange={(event) => handleChange(event.currentTarget.checked)}
        label={t('share.link.public')}
        description={t(isPublic ? 'share.link.publicHint' : 'share.link.privateHint')}
      />
      {isPublic && (
        <Group>
          <CopyButton value={typeof window === 'undefined' ? '' : new URL(href, window.location.origin).toString()}>
            {({ copied, copy }) => (
              <Button variant="default" size="xs" leftSection={copied ? <IconCheck size={14} /> : <IconLink size={14} />} onClick={copy}>
                {t(copied ? 'share.link.copied' : 'share.link.copy')}
              </Button>
            )}
          </CopyButton>
        </Group>
      )}
      {error && (
        <Text size="sm" c="red" role="alert">
          {error}
        </Text>
      )}
      <MakePrivateModal opened={confirmingPrivate} catalog={catalog} onClose={() => setConfirmingPrivate(false)} onConfirm={handleConfirmPrivate} />
    </Stack>
  );
}
