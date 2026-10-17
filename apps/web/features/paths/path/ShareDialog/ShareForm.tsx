'use client';

import { Button, Group, Select, TextInput } from '@mantine/core';
import { useT } from '@/i18n/I18nProvider';
import { useShareForm } from './useShareForm';

/** An email and the access to give it; adding someone already there changes their access */
export function ShareForm({ pathId }: { pathId: string }) {
  const t = useT();
  const { state, operations } = useShareForm(pathId);
  return (
    <form onSubmit={operations.submit} noValidate>
      <Group align="flex-start" gap="xs" wrap="nowrap">
        <TextInput
          type="email"
          label={t('share.people.email')}
          placeholder={t('share.people.emailPlaceholder')}
          value={state.email}
          onChange={(event) => operations.changeEmail(event.currentTarget.value)}
          error={state.error}
          style={{ flex: 1 }}
          data-autofocus
        />
        <Select
          label={t('share.people.role')}
          value={state.role}
          onChange={(value) => value && operations.changeRole(value)}
          data={[
            { value: 'viewer', label: t('share.people.viewer') },
            { value: 'editor', label: t('share.people.editor') },
          ]}
          allowDeselect={false}
          w={140}
        />
        <Button type="submit" loading={state.busy} mt={25}>
          {t('share.people.add')}
        </Button>
      </Group>
    </form>
  );
}
