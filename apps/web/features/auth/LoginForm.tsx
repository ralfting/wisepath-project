'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from '@tanstack/react-form';
import { Alert, Anchor, Button, Paper, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core';
import { loginFormSchema, useLogin } from '@/useCases/auth';
import { useDomainMessage } from '@/useCases/validation';
import { useT } from '@/i18n/I18nProvider';
import { fieldError } from '../shared/fieldError';
import { afterLogin } from '../shared/routes';

/** Log in with email and password, then go to the projects page, or back to where ?next= says */
export function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get('next');
  const login = useLogin();
  const t = useT();
  const domain = useDomainMessage();
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { email: '', password: '' },
    validators: { onSubmit: loginFormSchema },
    onSubmit: async ({ value }) => {
      setError(null);
      const failure = await login(value);
      if (failure) setError(failure);
      else router.push(afterLogin(next));
    },
  });

  return (
    <Paper withBorder p="xl" w="100%" maw={380}>
      <Stack gap={4} mb="lg">
        <Title order={1} size="h2">
          {t('auth.login.title')}
        </Title>
        <Text c="dimmed" size="sm">
          {t('auth.login.intro')}
        </Text>
      </Stack>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void form.handleSubmit();
        }}
      >
        <Stack gap="md">
          {error && (
            <Alert color="red" variant="light" role="alert">
              {error}
            </Alert>
          )}
          <form.Field name="email">
            {(field) => (
              <TextInput
                label={t('auth.fields.email')}
                type="email"
                placeholder={t('auth.fields.emailPlaceholder')}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.currentTarget.value)}
                onBlur={field.handleBlur}
                error={domain(fieldError(field.state.meta.errors))}
                required
              />
            )}
          </form.Field>
          <form.Field name="password">
            {(field) => (
              <PasswordInput
                label={t('auth.fields.password')}
                placeholder={t('auth.login.passwordPlaceholder')}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.currentTarget.value)}
                onBlur={field.handleBlur}
                error={domain(fieldError(field.state.meta.errors))}
                required
              />
            )}
          </form.Field>
          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <Button type="submit" fullWidth loading={isSubmitting}>
                {t('auth.login.submit')}
              </Button>
            )}
          </form.Subscribe>
        </Stack>
      </form>
      <Text size="sm" ta="center" mt="lg">
        {t('auth.login.noAccount')}{' '}
        <Anchor component={Link} href="/signup" fw={700}>
          {t('auth.login.signUp')}
        </Anchor>
      </Text>
    </Paper>
  );
}
