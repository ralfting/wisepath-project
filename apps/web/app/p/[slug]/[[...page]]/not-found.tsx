'use client';

import Link from 'next/link';
import { Anchor, Center, Stack, Text, Title } from '@mantine/core';
import { useT } from '@/i18n/I18nProvider';

/** An address in the catalog that leads nowhere: unpublished, gone, or mistyped */
export default function PublishedPageNotFound() {
  const t = useT();
  return (
    <Center component="main" mih="100vh" p="md">
      <Stack gap="sm" align="center" maw={420} ta="center">
        <Title order={1}>{t('share.public.notFoundTitle')}</Title>
        <Text c="dimmed">{t('share.public.notFoundBody')}</Text>
        <Anchor component={Link} href="/" fw={700}>
          {t('share.public.home')}
        </Anchor>
      </Stack>
    </Center>
  );
}
