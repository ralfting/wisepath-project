'use client';

import { IconCircle, IconCircleCheckFilled, IconCircleDotFilled } from '@tabler/icons-react';
import type { TranslationKey } from '@/i18n/I18nProvider';

export type TopicStatus = 'done' | 'current' | 'todo';

/** The message naming each status */
export const STATUS_KEY: Record<TopicStatus, TranslationKey> = {
  done: 'map.status.done',
  current: 'map.status.current',
  todo: 'map.status.todo',
};

/** A page's study status as an icon: studied, the one to study next, or still to study */
export function StatusIcon({ status, size = 18 }: { status: TopicStatus; size?: number }) {
  if (status === 'done') return <IconCircleCheckFilled size={size} color="var(--mantine-color-teal-6)" aria-hidden="true" />;
  if (status === 'current') return <IconCircleDotFilled size={size} color="var(--mantine-color-blue-6)" aria-hidden="true" />;
  return <IconCircle size={size} stroke={1.8} color="var(--mantine-color-gray-5)" aria-hidden="true" />;
}
