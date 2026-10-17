'use client';

import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { Button, Group, Select, Text, TextInput } from '@mantine/core';
import type { MemberRole } from '@wisepath/domain/paths';
import { shareFormSchema, useSharePath } from '@/useCases/paths';
import { useDomainMessage } from '@/useCases/validation';
import { useT } from '@/i18n/I18nProvider';
import { fieldError } from '@/shared/forms';

/** An email and the access to give it; adding someone already there changes their access. Empties once it worked */
export function ShareForm({ pathId }: { pathId: string }) {
  const t = useT();
  const share = useSharePath();
  const domain = useDomainMessage();
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { email: '', role: 'viewer' as MemberRole },
    validators: { onSubmit: shareFormSchema },
    onSubmit: async ({ value }) => {
      setError(null);
      const result = await share(pathId, value.email, value.role);
      if (!result.ok) return setError(result.message);
      form.reset();
    },
  });

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <Group align="flex-start" gap="xs" wrap="nowrap">
        <form.Field name="email">
          {(field) => (
            <TextInput
              type="email"
              label={t('share.people.email')}
              placeholder={t('share.people.emailPlaceholder')}
              value={field.state.value}
              onChange={(event) => {
                setError(null);
                field.handleChange(event.currentTarget.value);
              }}
              onBlur={field.handleBlur}
              error={domain(fieldError(field.state.meta.errors))}
              style={{ flex: 1 }}
              data-autofocus
            />
          )}
        </form.Field>
        <form.Field name="role">
          {(field) => (
            <Select
              label={t('share.people.role')}
              value={field.state.value}
              onChange={(value) => field.handleChange(value === 'editor' ? 'editor' : 'viewer')}
              data={[
                { value: 'viewer', label: t('share.people.viewer') },
                { value: 'editor', label: t('share.people.editor') },
              ]}
              allowDeselect={false}
              w={140}
            />
          )}
        </form.Field>
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(submitting) => (
            <Button type="submit" loading={submitting} mt={25}>
              {t('share.people.add')}
            </Button>
          )}
        </form.Subscribe>
      </Group>
      {error && (
        <Text size="sm" c="red" role="alert" mt="xs">
          {error}
        </Text>
      )}
    </form>
  );
}
