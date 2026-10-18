'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from '@tanstack/react-form';
import { Alert, Anchor, Button, Group, PasswordInput, Stack, Text } from '@mantine/core';
import { IconDownload } from '@tabler/icons-react';
import { deleteAccountFormSchema, useDeleteAccount } from '@/useCases/auth';
import { allPathsDownloadHref } from '@/useCases/paths';
import { useDomainMessage } from '@/useCases/validation';
import { useT } from '@/i18n/I18nProvider';
import { fieldError } from '@/shared/forms';

/** What goes, the download offered first, and the password that confirms it; on success, off to the login page */
export function DeleteAccountForm({ onCancel }: { onCancel: () => void }) {
  const router = useRouter();
  const deleteAccount = useDeleteAccount();
  const t = useT();
  const domain = useDomainMessage();
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { password: '' },
    validators: { onSubmit: deleteAccountFormSchema },
    onSubmit: async ({ value }) => {
      setError(null);
      const failure = await deleteAccount(value);
      if (failure) setError(failure);
      else router.replace('/login');
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
      <Stack gap="md">
        <Text size="sm">{t('auth.deleteAccount.body')}</Text>
        <Anchor href={allPathsDownloadHref()} download size="sm">
          <Group gap={6} component="span">
            <IconDownload size={15} aria-hidden />
            {t('auth.deleteAccount.downloadFirst')}
          </Group>
        </Anchor>
        {error && (
          <Alert color="red" variant="light" role="alert">
            {error}
          </Alert>
        )}
        <form.Field name="password">
          {(field) => (
            <PasswordInput
              label={t('auth.fields.password')}
              description={t('auth.deleteAccount.confirmHint')}
              value={field.state.value}
              onChange={(event) => field.handleChange(event.currentTarget.value)}
              onBlur={field.handleBlur}
              error={domain(fieldError(field.state.meta.errors))}
              required
              data-autofocus
            />
          )}
        </form.Field>
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={onCancel}>
            {t('auth.deleteAccount.keep')}
          </Button>
          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <Button type="submit" color="red" loading={isSubmitting}>
                {t('auth.deleteAccount.confirm')}
              </Button>
            )}
          </form.Subscribe>
        </Group>
      </Stack>
    </form>
  );
}
