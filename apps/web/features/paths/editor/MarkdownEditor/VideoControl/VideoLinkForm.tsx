'use client';

import type { Editor } from '@tiptap/react';
import { Button, Stack, TextInput } from '@mantine/core';
import { useT } from '@/i18n/I18nProvider';
import { useVideoLinkForm } from './useVideoLinkForm';

/** The YouTube link to embed, and the button that embeds it */
export function VideoLinkForm({ editor, onAdded }: { editor: Editor; onAdded: () => void }) {
  const t = useT();
  const { state, operations } = useVideoLinkForm({ editor, onAdded });
  return (
    <form onSubmit={operations.submit}>
      <Stack gap="xs" w={260}>
        <TextInput
          label={t('editor.video.label')}
          placeholder="https://www.youtube.com/watch?v=…"
          value={state.url}
          onChange={(event) => operations.changeUrl(event.currentTarget.value)}
          error={state.invalid ? t('editor.video.invalid') : undefined}
          data-autofocus
        />
        <Button type="submit" size="compact-sm" w="fit-content">
          {t('editor.video.add')}
        </Button>
      </Stack>
    </form>
  );
}
