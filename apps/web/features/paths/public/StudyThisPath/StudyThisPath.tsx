'use client';

import Link from 'next/link';
import { Alert, Button, Group, Stack, Tooltip } from '@mantine/core';
import { IconPlayerPlayFilled } from '@tabler/icons-react';
import { useT } from '@/i18n/I18nProvider';
import { useStudyThisPath } from './useStudyThisPath';

/** Study this path for a learner; sign up or log in for a visitor, coming back to where they read it */
export function StudyThisPath({ pathId, readingHref }: { pathId: string; readingHref: string }) {
  const t = useT();
  const { state, operations } = useStudyThisPath(pathId, readingHref);
  return (
    <Stack gap={4} align="flex-end">
      {/* What studying means (your own progress, the path stays its owner's), said on the button itself */}
      <Tooltip label={t('share.public.studyHint')} multiline w={260} withArrow>
        {state.signedIn ? (
          <Button size="sm" leftSection={<IconPlayerPlayFilled size={14} />} loading={state.busy} onClick={() => void operations.study()}>
            {t('share.public.study')}
          </Button>
        ) : (
          <Group gap="xs" wrap="nowrap">
            <Button size="sm" component={Link} href={state.signupHref} variant="default">
              {t('share.public.signUp')}
            </Button>
            <Button size="sm" component={Link} href={state.loginHref}>
              {t('share.public.logIn')}
            </Button>
          </Group>
        )}
      </Tooltip>
      {state.error && (
        <Alert color="red" role="alert">
          {state.error}
        </Alert>
      )}
    </Stack>
  );
}
