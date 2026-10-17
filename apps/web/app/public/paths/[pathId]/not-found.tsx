'use client';

import Link from 'next/link';
import { Anchor, Center, Stack, Text, Title } from '@mantine/core';
import { useT } from '@/i18n/I18nProvider';

/** A private path, or a link that leads nowhere: the same answer, so a private path's existence never shows */
export default function PublicPathNotFound() {
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
