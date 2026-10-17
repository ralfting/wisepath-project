'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Project } from '@wisepath/domain/projects';
import { useCreateProject, useRenameProject } from '@/useCases/projects';
import { useT } from '@/i18n/I18nProvider';

/** The project name form: its field, its error, and saving it as a new project or as `project`'s new name */
export function useProjectNameForm({ project, onDone }: { project?: Project; onDone: () => void }) {
  const create = useCreateProject();
  const rename = useRenameProject();
  const t = useT();
  const [name, setName] = useState(project?.name ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const changeName = (value: string) => {
    setName(value);
    setError(null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return setError(t('home.projectForm.nameRequired'));
    setBusy(true);
    const message = project ? await rename(project.id, name) : await create(name).then((result) => (result.ok ? null : result.message));
    setBusy(false);
    if (message) return setError(message);
    onDone();
  };

  return { state: { name, error, busy, renaming: project !== undefined }, operations: { changeName, submit, cancel: onDone } };
}
