'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from '@tanstack/react-form';
import { Alert, Anchor, Button, Paper, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core';
import { signupFormSchema, useSignup } from '@/useCases/auth';
import { fieldError } from '../shared/fieldError';

/** Create an account, then go to the projects page */
export function SignupForm() {
  const router = useRouter();
  const signup = useSignup();
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
          Create an account
        </Title>
        <Text c="dimmed" size="sm">
          Your projects and notes are kept under this account.
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
                label="Name"
                placeholder="How should we call you?"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.currentTarget.value)}
                onBlur={field.handleBlur}
                error={fieldError(field.state.meta.errors)}
                required
              />
            )}
          </form.Field>
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
                description="At least 8 characters"
                placeholder="Choose a password"
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
                Create account
              </Button>
            )}
          </form.Subscribe>
        </Stack>
      </form>
      <Text size="sm" ta="center" mt="lg">
        Already have an account?{' '}
        <Anchor component={Link} href="/login" fw={700}>
          Log in
        </Anchor>
      </Text>
    </Paper>
  );
}
