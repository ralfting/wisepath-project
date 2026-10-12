import { Center } from '@mantine/core';
import { LoginForm } from '@/domain/auth';

export default function LoginPage() {
  return (
    <Center component="main" mih="100vh" p="md">
      <LoginForm />
    </Center>
  );
}
