import { Center } from '@mantine/core';
import { SignupForm } from '@/domain/auth';

export default function SignupPage() {
  return (
    <Center component="main" mih="100vh" p="md">
      <SignupForm />
    </Center>
  );
}
