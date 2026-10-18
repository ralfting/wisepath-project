'use client';

import Link from 'next/link';
import { Alert, Button, Group, Stack, Text } from '@mantine/core';
import { IconPlayerPlayFilled } from '@tabler/icons-react';
import { useT } from '@/i18n/I18nProvider';
import { useStudyThisPath } from './useStudyThisPath';

/** Study this path for a learner; sign up or log in for a visitor, coming back to where they read it */
export function StudyThisPath({ pathId, readingHref }: { pathId: string; readingHref: string }) {
  const t = useT();
  const { state, operations } = useStudyThisPath(pathId, readingHref);
  return (
    <Stack gap={4} align="flex-end">
      {state.signedIn ? (
        <Button leftSection={<IconPlayerPlayFilled size={14} />} loading={state.busy} onClick={() => void operations.study()}>
          {t('share.public.study')}
        </Button>
      ) : (
        <Group gap="sm">
          <Button component={Link} href={state.signupHref} variant="default">
            {t('share.public.signUp')}
          </Button>
          <Button component={Link} href={state.loginHref}>
            {t('share.public.logIn')}
          </Button>
        </Group>
      )}
      <Text size="xs" c="dimmed">
        {t('share.public.studyHint')}
      </Text>
      {state.error && (
        <Alert color="red" role="alert">
          {state.error}
        </Alert>
      )}
    </Stack>
  );
}
