'use client';

import Link from 'next/link';
import { Anchor, Center, Stack, Text, Title } from '@mantine/core';
import { useT } from '@/i18n/I18nProvider';

/** Any address with no screen behind it; "/" sends a learner to their paths and a visitor to the landing page */
export default function NotFound() {
  const t = useT();
  return (
    <Center component="main" mih="100vh" p="md">
      <Stack gap="sm" align="center" maw={420} ta="center">
        <Title order={1}>{t('common.notFound.title')}</Title>
        <Text c="dimmed">{t('common.notFound.body')}</Text>
        <Anchor component={Link} href="/" fw={700}>
          {t('common.notFound.home')}
        </Anchor>
      </Stack>
    </Center>
  );
}
