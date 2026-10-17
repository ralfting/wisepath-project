'use client';

import type { Editor } from '@tiptap/react';
import { RichTextEditor } from '@mantine/tiptap';
import { Button, Popover, Stack, TextInput } from '@mantine/core';
import { IconBrandYoutube } from '@tabler/icons-react';
import { useState } from 'react';
import { youTubeId } from './youtube';
import { useT } from '@/i18n/I18nProvider';

/** Toolbar control that embeds a YouTube video from its link */
export function VideoControl({ editor }: { editor: Editor }) {
  const t = useT();
  const [opened, setOpened] = useState(false);
  const [url, setUrl] = useState('');
  const [error, setError] = useState(false);

  const add = () => {
    if (!youTubeId(url.trim())) {
      setError(true);
      return;
    }
    editor.chain().focus().setYoutubeVideo({ src: url.trim() }).run();
    setUrl('');
    setError(false);
    setOpened(false);
  };

  return (
    <Popover opened={opened} onChange={setOpened} position="bottom" withArrow shadow="md" trapFocus>
      <Popover.Target>
        <RichTextEditor.Control
          onClick={() => setOpened((o) => !o)}
          aria-label={t('editor.video.control')}
          title={t('editor.video.control')}
        >
          <IconBrandYoutube size={16} stroke={1.5} />
        </RichTextEditor.Control>
      </Popover.Target>
      <Popover.Dropdown>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <Stack gap="xs" w={260}>
            <TextInput
              label={t('editor.video.label')}
              placeholder="https://www.youtube.com/watch?v=…"
              value={url}
              onChange={(e) => {
                setUrl(e.currentTarget.value);
                setError(false);
              }}
              error={error ? t('editor.video.invalid') : undefined}
              data-autofocus
            />
            <Button type="submit" size="compact-sm" w="fit-content">
              {t('editor.video.add')}
            </Button>
          </Stack>
        </form>
      </Popover.Dropdown>
    </Popover>
  );
}
