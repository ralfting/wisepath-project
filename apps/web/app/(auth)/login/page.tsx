import { Suspense } from 'react';
import { Center } from '@mantine/core';
import { LoginForm } from '@/features/auth';

export default function LoginPage() {
  return (
    <Center component="main" mih="100vh" p="md">
      {/* The form reads ?next= from the address; reading it needs a boundary for the page to be prerendered */}
      <Suspense>
        <LoginForm />
      </Suspense>
    </Center>
  );
}
