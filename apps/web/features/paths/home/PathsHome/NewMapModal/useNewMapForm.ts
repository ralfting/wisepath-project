'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useCreatePath } from '@/useCases/paths';
import { mapWithPageHref } from '@/shared/routes';
import { useT } from '@/i18n/I18nProvider';

/** The new map form: its name and project, and making the map, then opening its root page to write in */
export function useNewMapForm({ projectId, onDone }: { projectId: string | null; onDone: () => void }) {
  const router = useRouter();
  const create = useCreatePath();
  const t = useT();
  const [title, setTitle] = useState('');
  const [project, setProject] = useState<string | null>(projectId);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const changeTitle = (value: string) => {
    setTitle(value);
    setError(null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return setError(t('home.create.nameRequired'));
    if (!project) return;
    setBusy(true);
    const result = await create(title, project);
    setBusy(false);
    if (!result.ok) return setError(result.message);
    onDone();
    // Straight to writing: the map with its main page open, the cursor in the text
    router.push(`${mapWithPageHref(result.value.id, result.value.rootPageId)}&new=1`);
  };

  return {
    state: { title, project, error, busy },
    operations: { changeTitle, setProject, submit, cancel: onDone },
  };
}
