'use client';

import Link from 'next/link';
import { Anchor, Center, Stack, Text, Title } from '@mantine/core';
import { useT } from '@/i18n/I18nProvider';

export default function PathNotFound() {
  const t = useT();
  return (
    <Center component="main" mih="100vh" p="md">
      <Stack gap="sm" align="center" maw={420} ta="center">
        <Title order={1} fz={30}>
          {t('home.notFound.title')}
        </Title>
        <Text c="dimmed">{t('home.notFound.body')}</Text>
        <Anchor component={Link} href="/paths" fw={700}>
          {t('home.notFound.back')}
        </Anchor>
      </Stack>
    </Center>
  );
}
