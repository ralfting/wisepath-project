'use client';

import { Button, Card, Group, List, Stack, Text, Title } from '@mantine/core';
import { IconPlus, IconSparkles } from '@tabler/icons-react';
import { useT } from '@/i18n/I18nProvider';
import { useFirstVisit } from './useFirstVisit';

/**
 * What a learner with no path sees in place of the empty list: how WisePath works in three lines, and two ways to
 * start. It goes away with the first path and never comes back
 */
export function FirstVisit({ onNewPath }: { onNewPath: () => void }) {
  const t = useT();
  const { state, operations } = useFirstVisit();
  return (
    <Card withBorder radius="lg" padding="xl" maw={640} component="section" aria-labelledby="first-visit">
      <Stack gap="md">
        <Title order={2} id="first-visit">
          {t('home.first.title')}
        </Title>
        <List type="ordered" spacing="xs">
          <List.Item>{t('home.first.make')}</List.Item>
          <List.Item>{t('home.first.link')}</List.Item>
          <List.Item>{t('home.first.study')}</List.Item>
        </List>
        <Group gap="sm">
          <Button leftSection={<IconPlus size={16} />} onClick={onNewPath}>
            {t('home.newPath')}
          </Button>
          <Button variant="default" leftSection={<IconSparkles size={16} />} loading={state.busy} onClick={() => void operations.trySample()}>
            {t('home.first.sample')}
          </Button>
        </Group>
        {state.error && (
          <Text size="sm" c="red" role="alert">
            {state.error}
          </Text>
        )}
      </Stack>
    </Card>
  );
}
