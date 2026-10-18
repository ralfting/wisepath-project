'use client';

import { Button, Center, Stack, Text } from '@mantine/core';
import { useT } from '@/i18n/I18nProvider';

/** WisePath could not be reached while reading the requests to publish */
export default function PublicationsError({ reset }: { error: Error; reset: () => void }) {
  const t = useT();
  return (
    <Center component="main" mih="100vh" p="md">
      <Stack gap="sm" align="center" maw={420} ta="center">
        <Text>{t('common.errors.unavailable')}</Text>
        <Button onClick={reset}>{t('common.actions.retry')}</Button>
      </Stack>
    </Center>
  );
}
