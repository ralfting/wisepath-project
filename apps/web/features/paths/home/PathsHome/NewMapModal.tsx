'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Button, Group, Modal, Radio, Select, Stack, Text, TextInput, ThemeIcon } from '@mantine/core';
import type { PathKind } from '@wisepath/domain/paths';
import type { Project } from '@wisepath/domain/projects';
import { useCreatePath } from '@/useCases/paths';
import { KIND_OPTIONS } from '@/features/paths/path';
import { mapWithPageHref } from '@/shared/routes';
import { useT } from '@/i18n/I18nProvider';
import classes from './PathsHome.module.css';

/**
 * Names a new map, which starts as its root page, files it in a project (the
 * one it was opened from) and says what it is for: a study unless chosen otherwise
 */
export function NewMapModal({
  opened,
  projectId,
  projects,
  onClose,
}: {
  opened: boolean;
  projectId: string | null;
  projects: ReadonlyArray<Project>;
  onClose: () => void;
}) {
  const router = useRouter();
  const create = useCreatePath();
  const t = useT();
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<PathKind>('study');
  const [project, setProject] = useState<string | null>(projectId);

  // Opens on the project it was opened from
  useEffect(() => {
    if (opened) setProject(projectId);
  }, [opened, projectId]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const close = () => {
    setTitle('');
    setKind('study');
    setError(null);
    onClose();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return setError(t('home.create.nameRequired'));
    if (!project) return;
    setBusy(true);
    const result = await create(title, kind, project);
    setBusy(false);
    if (!result.ok) return setError(result.message);
    close();
    // Straight to writing: the map with its main page open, the cursor in the text
    router.push(`${mapWithPageHref(result.value.id, result.value.rootPageId)}&new=1`);
  };

  return (
    <Modal opened={opened} onClose={close} title={t('home.create.title')} centered radius="lg" size="md" closeButtonProps={{ 'aria-label': t('common.actions.close') }}>
      <form onSubmit={submit} noValidate>
        <TextInput
          label={t('home.create.name')}
          description={t('home.create.nameHint')}
          placeholder={t('home.create.namePlaceholder')}
          value={title}
          onChange={(e) => {
            setTitle(e.currentTarget.value);
            setError(null);
          }}
          error={error}
          maxLength={200}
          data-autofocus
        />
        <Select
          label={t('home.create.project')}
          data={projects.map((p) => ({ value: p.id, label: p.name }))}
          value={project}
          onChange={setProject}
          allowDeselect={false}
          comboboxProps={{ withinPortal: false }}
          mt="lg"
        />
        <Radio.Group value={kind} onChange={(v) => setKind(v as PathKind)} label={t('home.create.kind')} description={t('home.create.kindHint')} mt="lg">
          <Stack gap="xs" mt="xs">
            {KIND_OPTIONS.map((option) => (
              <Radio.Card key={option.value} value={option.value} radius="md" p="sm" className={classes.kindCard}>
                <Group wrap="nowrap" align="flex-start" gap="sm">
                  <Radio.Indicator mt={2} />
                  <ThemeIcon variant="light" color={option.color} radius="md" size={34}>
                    <option.icon size={19} />
                  </ThemeIcon>
                  <div>
                    <Text fw={600} size="sm">
                      {t(option.label)}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {t(option.hint)}
                    </Text>
                  </div>
                </Group>
              </Radio.Card>
            ))}
          </Stack>
        </Radio.Group>
        <Group justify="flex-end" gap="sm" mt="lg">
          <Button variant="default" onClick={close}>
            {t('common.actions.cancel')}
          </Button>
          <Button type="submit" loading={busy}>
            {t('home.create.submit')}
          </Button>
        </Group>
      </form>
    </Modal>
  );
}
