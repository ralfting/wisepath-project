'use client';

import { useState } from 'react';
import { Accordion, Badge, Group, List, Stack, Text } from '@mantine/core';
import { IconBulb, IconPlayerPlay } from '@tabler/icons-react';
import { useT } from '@/i18n/I18nProvider';
import classes from './HelpPanel.module.css';
import { Rich } from '../Rich';
import type { Screen } from '../screen';
import { TOPICS, key } from './HelpPanel.helpers';
import { Clip } from './Clip';

/** The screen's topics, one open at a time, so the panel stays short; a clip only plays while open */
export function Topics({ screen }: { screen: Screen }) {
  const t = useT();
  const { intro, topics } = TOPICS[screen];
  // A single topic starts open; with more, all start closed so the list reads first
  const [open, setOpen] = useState<string | null>(topics.length === 1 ? topics[0].base : null);

  return (
    <Stack gap="md">
      <Text c="dimmed">{t(intro)}</Text>
      <Accordion value={open} onChange={setOpen} variant="separated" radius="md" chevronPosition="right">
        {topics.map((topic) => {
          const title = t(key(`${topic.base}.title`));
          return (
            <Accordion.Item key={topic.base} value={topic.base}>
              <Accordion.Control icon={topic.clip ? <IconPlayerPlay size={16} /> : <IconBulb size={16} />}>
                <Text fw={600} size="sm">
                  {title}
                </Text>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="md">
                  {topic.clip && open === topic.base && <Clip name={topic.clip} label={title} />}
                  <List type="ordered" spacing={8} size="sm" classNames={{ item: classes.step }}>
                    {'abcd'.slice(0, topic.steps).split('').map((step) => (
                      <List.Item key={step}>
                        <Rich text={t(key(`${topic.base}.steps.${step}`))} />
                      </List.Item>
                    ))}
                  </List>
                  <Group gap={8} wrap="nowrap" align="flex-start" className={classes.tip}>
                    <Badge size="sm" variant="light" color="yellow" leftSection={<IconBulb size={12} />} style={{ flexShrink: 0 }}>
                      {t('help.tip')}
                    </Badge>
                    <Text size="sm">
                      <Rich text={t(key(`${topic.base}.tip`))} />
                    </Text>
                  </Group>
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          );
        })}
      </Accordion>
    </Stack>
  );
}
