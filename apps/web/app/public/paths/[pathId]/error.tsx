'use client';

import { Button, Center, Stack, Text, Title } from '@mantine/core';
import { useT } from '@/i18n/I18nProvider';

/** WisePath could not be reached while reading the public path */
export default function PublicPathError({ reset }: { error: Error; reset: () => void }) {
  const t = useT();
  return (
    <Center component="main" mih="100vh" p="md">
      <Stack gap="sm" align="center" maw={420} ta="center">
        <Title order={1}>{t('share.public.errorTitle')}</Title>
        <Text c="dimmed">{t('share.public.errorBody')}</Text>
        <Button onClick={reset}>{t('share.public.retry')}</Button>
      </Stack>
    </Center>
  );
}
