'use client';

import Link from 'next/link';
import { Anchor, Badge, Button, Group, Text, Tooltip } from '@mantine/core';
import { IconCards, IconCheck } from '@tabler/icons-react';
import { useT } from '@/i18n/I18nProvider';
import { usePathCards } from '@/useCases/review';

/**
 * PathCards
 * How many cards a path has and how many are due today, with the way to
 * review them; nothing while the path has no cards. On a path's home card
 * and on its centre page.
 */
export function PathCards({ projectId, title, className }: { projectId: string; title: string; className?: string }) {
  const t = useT();
  const cards = usePathCards(projectId);
  if (!cards || cards.cards === 0) return null;
  const due = t('review.path.due', { count: cards.due });

  return (
    <Group gap={8} wrap="nowrap" className={className}>
      <IconCards size={16} color="var(--mantine-color-dimmed)" aria-hidden />
      <Text size="sm" c="dimmed">
        {t('review.path.cards', { count: cards.cards })} · {due}
      </Text>
      {cards.due > 0 && (
        <Anchor component={Link} href={`/review?path=${encodeURIComponent(projectId)}`} size="sm" fw={600} aria-label={t('review.path.reviewLabel', { path: title, due })}>
          {t('review.path.review')}
        </Anchor>
      )}
    </Group>
  );
}

/**
 * The path's review, from inside it (the map's top bar), whenever the path has cards: with how many are due
 * today, or a tick once none are, opening the review of this path alone
 */
export function PathReviewButton({ projectId, title }: { projectId: string; title: string }) {
  const t = useT();
  const cards = usePathCards(projectId);
  if (!cards || cards.cards === 0) return null;
  const due = t('review.path.due', { count: cards.due });
  return (
    <Tooltip label={due} withArrow>
      <Button
        component={Link}
        href={`/review?path=${encodeURIComponent(projectId)}`}
        size="compact-sm"
        variant={cards.due > 0 ? 'light' : 'subtle'}
        color={cards.due > 0 ? undefined : 'gray'}
        radius="md"
        leftSection={<IconCards size={15} aria-hidden />}
        rightSection={
          cards.due > 0 ? (
            <Badge size="sm" circle variant="filled" aria-hidden>
              {cards.due}
            </Badge>
          ) : (
            <IconCheck size={14} color="var(--mantine-color-teal-7)" aria-hidden />
          )
        }
        aria-label={t('review.path.reviewLabel', { path: title, due })}
        style={{ flexShrink: 0 }}
      >
        {t('review.path.review')}
      </Button>
    </Tooltip>
  );
}
