'use client';

/**
 * SignupForm - Form UI component for user registration
 * Handles form state, validation, and error display
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Alert, Anchor, Button, Paper, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core';
import { useAuth } from '../hooks/useAuth';

export function SignupForm() {
  const router = useRouter();
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await signup(email, password, name);
      router.push('/projects');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Signup failed';
      setError(errorMessage);
      setIsLoading(false);
    }
  };

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
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          {error && (
            <Alert color="red" variant="light" role="alert">
              {error}
            </Alert>
          )}
          <TextInput
            label="Name"
            placeholder="How should we call you?"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            required
            disabled={isLoading}
          />
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
            description="At least 8 characters"
            placeholder="Choose a password"
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            required
            minLength={8}
            disabled={isLoading}
          />
          <Button type="submit" fullWidth loading={isLoading}>
            Create account
          </Button>
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
