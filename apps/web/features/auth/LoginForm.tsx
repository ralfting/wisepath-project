'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from '@tanstack/react-form';
import { Alert, Anchor, Button, Paper, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core';
import { loginFormSchema, useLogin } from '@/useCases/auth';
import { fieldError } from '../shared/fieldError';

/** Log in with email and password, then go to the projects page */
export function LoginForm() {
  const router = useRouter();
  const login = useLogin();
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { email: '', password: '' },
    validators: { onSubmit: loginFormSchema },
    onSubmit: async ({ value }) => {
      setError(null);
      const failure = await login(value);
      if (failure) setError(failure);
      else router.push('/projects');
    },
  });

  return (
    <Paper withBorder p="xl" w="100%" maw={380}>
      <Stack gap={4} mb="lg">
        <Title order={1} size="h2">
          Log in
        </Title>
        <Text c="dimmed" size="sm">
          Enter your email and password to continue to your projects.
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
                label="Email"
                type="email"
                placeholder="you@example.com"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.currentTarget.value)}
                onBlur={field.handleBlur}
                error={fieldError(field.state.meta.errors)}
                required
              />
            )}
          </form.Field>
          <form.Field name="password">
            {(field) => (
              <PasswordInput
                label="Password"
                placeholder="Your password"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.currentTarget.value)}
                onBlur={field.handleBlur}
                error={fieldError(field.state.meta.errors)}
                required
              />
            )}
          </form.Field>
          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <Button type="submit" fullWidth loading={isSubmitting}>
                Log in
              </Button>
            )}
          </form.Subscribe>
        </Stack>
      </form>
      <Text size="sm" ta="center" mt="lg">
        Don&apos;t have an account?{' '}
        <Anchor component={Link} href="/signup" fw={700}>
          Sign up
        </Anchor>
      </Text>
    </Paper>
  );
}
