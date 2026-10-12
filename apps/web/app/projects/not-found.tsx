import Link from 'next/link';
import { Anchor, Center, Stack, Text, Title } from '@mantine/core';

export default function ProjectNotFound() {
  return (
    <Center component="main" mih="100vh" p="md">
      <Stack gap="sm" align="center" maw={420} ta="center">
        <Title order={1} fz={30}>
          Project not found
        </Title>
        <Text c="dimmed">This project doesn&apos;t exist or the link is wrong. Your projects are listed on the projects page.</Text>
        <Anchor component={Link} href="/projects" fw={700}>
          Go to your projects
        </Anchor>
      </Stack>
    </Center>
  );
}
