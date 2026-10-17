'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Editor } from '@tiptap/react';
import { youTubeId } from '../../youtube';

/** The video link form's view model: the link typed, whether it is a YouTube one, and embedding it in the page */
export function useVideoLinkForm({ editor, onAdded }: { editor: Editor; onAdded: () => void }) {
  const [url, setUrl] = useState('');
  const [invalid, setInvalid] = useState(false);

  const changeUrl = (value: string) => {
    setUrl(value);
    setInvalid(false);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!youTubeId(url.trim())) return setInvalid(true);
    editor.chain().focus().setYoutubeVideo({ src: url.trim() }).run();
    onAdded();
  };

  return { state: { url, invalid }, operations: { changeUrl, submit } };
}
