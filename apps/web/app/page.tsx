import Link from 'next/link';
import { Button, Center, Group, Stack, Text, Title } from '@mantine/core';

export default function Home() {
  return (
    <Center component="main" mih="100vh" p="md">
      <Stack align="center" gap="lg">
        <Title order={1} fz={48}>
          WisePath
        </Title>
        <Text size="lg" c="dimmed" ta="center">
          Map what you are learning, page by page, down to &ldquo;Now I know it&rdquo;.
        </Text>
        <Group>
          <Button component={Link} href="/login">
            Log in
          </Button>
          <Button component={Link} href="/signup" variant="default">
            Sign up
          </Button>
        </Group>
      </Stack>
    </Center>
  );
}
