'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from '@tanstack/react-form';
import { Alert, Anchor, Button, Paper, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core';
import { signupFormSchema, useSignup } from '@/useCases/auth';
import { useDomainMessage } from '@/useCases/validation';
import { useT } from '@/i18n/I18nProvider';
import { fieldError } from '../shared/fieldError';

/** Create an account, then go to the projects page */
export function SignupForm() {
  const router = useRouter();
  const signup = useSignup();
  const t = useT();
  const domain = useDomainMessage();
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { name: '', email: '', password: '' },
    validators: { onSubmit: signupFormSchema },
    onSubmit: async ({ value }) => {
      setError(null);
      const failure = await signup(value);
      if (failure) setError(failure);
      else router.push('/projects');
    },
  });

  return (
    <Paper withBorder p="xl" w="100%" maw={380}>
      <Stack gap={4} mb="lg">
        <Title order={1} size="h2">
          {t('auth.signup.title')}
        </Title>
        <Text c="dimmed" size="sm">
          {t('auth.signup.intro')}
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
          <form.Field name="name">
            {(field) => (
              <TextInput
                label={t('auth.fields.name')}
                placeholder={t('auth.fields.namePlaceholder')}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.currentTarget.value)}
                onBlur={field.handleBlur}
                error={domain(fieldError(field.state.meta.errors))}
                required
              />
            )}
          </form.Field>
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
                description={t('auth.signup.passwordHint')}
                placeholder={t('auth.signup.passwordPlaceholder')}
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
                {t('auth.signup.submit')}
              </Button>
            )}
          </form.Subscribe>
        </Stack>
      </form>
      <Text size="sm" ta="center" mt="lg">
        {t('auth.signup.haveAccount')}{' '}
        <Anchor component={Link} href="/login" fw={700}>
          {t('auth.signup.logIn')}
        </Anchor>
      </Text>
    </Paper>
  );
}
