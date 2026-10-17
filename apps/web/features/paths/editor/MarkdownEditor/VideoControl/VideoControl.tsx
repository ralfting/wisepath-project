'use client';

import type { Editor } from '@tiptap/react';
import { RichTextEditor } from '@mantine/tiptap';
import { Popover } from '@mantine/core';
import { IconBrandYoutube } from '@tabler/icons-react';
import { useState } from 'react';
import { useT } from '@/i18n/I18nProvider';
import { VideoLinkForm } from './VideoLinkForm';

/** Toolbar control that embeds a YouTube video from its link */
export function VideoControl({ editor }: { editor: Editor }) {
  const t = useT();
  const [opened, setOpened] = useState(false);
  return (
    <Popover opened={opened} onChange={setOpened} position="bottom" withArrow shadow="md" trapFocus>
      <Popover.Target>
        <RichTextEditor.Control onClick={() => setOpened((o) => !o)} aria-label={t('editor.video.control')} title={t('editor.video.control')}>
          <IconBrandYoutube size={16} stroke={1.5} />
        </RichTextEditor.Control>
      </Popover.Target>
      <Popover.Dropdown>
        {/* The dropdown mounts its content on each opening, so the field starts empty */}
        <VideoLinkForm editor={editor} onAdded={() => setOpened(false)} />
      </Popover.Dropdown>
    </Popover>
  );
}
