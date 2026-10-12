'use client';

/**
 * LoginForm - Form UI component for user login
 * Handles form state, validation, and error display
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Alert, Anchor, Button, Paper, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core';
import { useAuth } from '../hooks/useAuth';

export function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await login(email, password);
      router.push('/projects');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      setIsLoading(false);
    }
  };

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
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          {error && (
            <Alert color="red" variant="light" role="alert">
              {error}
            </Alert>
          )}
          <TextInput
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            required
            disabled={isLoading}
          />
          <PasswordInput
            label="Password"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            required
            disabled={isLoading}
          />
          <Button type="submit" fullWidth loading={isLoading}>
            Log in
          </Button>
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
