'use client';

import Link from 'next/link';
import { Button, Center, Group, List, Stack, Text, Title } from '@mantine/core';
import { useT } from '@/i18n/I18nProvider';

export default function Home() {
  const t = useT();
  return (
    <Center component="main" mih="100vh" p="md">
      <Stack align="center" gap="lg">
        <Title order={1} fz={48}>
          WisePath
        </Title>
        <Text size="lg" c="dimmed" ta="center">
          {t('auth.landing.tagline')}
        </Text>
        <List spacing={4} c="dimmed">
          <List.Item>{t('auth.landing.what')}</List.Item>
          <List.Item>{t('auth.landing.links')}</List.Item>
          <List.Item>{t('auth.landing.study')}</List.Item>
        </List>
        <Group>
          <Button component={Link} href="/login">
            {t('auth.landing.logIn')}
          </Button>
          <Button component={Link} href="/signup" variant="default">
            {t('auth.landing.signUp')}
          </Button>
        </Group>
      </Stack>
    </Center>
  );
}
