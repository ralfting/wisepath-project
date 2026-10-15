'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Anchor, Button, Card, Center, Code, Group, Kbd, Loader, Select, SimpleGrid, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconCards, IconCircleCheck } from '@tabler/icons-react';
import { nextIntervals } from '@wisepath/domain/review';
import type { DueCard, Grade } from '@wisepath/domain/review';
import { AppFrame } from '@/features/shell/AppFrame';
import { pageHref } from '@/features/shared/routes';
import { useLocale, useT } from '@/i18n/I18nProvider';
import { useProjects } from '@/useCases/projects';
import { useReviewCounts, useReviewSitting } from '@/useCases/review';
import { InlineText } from './inline';
import { untilNext } from './when';
import classes from './ReviewPage.module.css';

/**
 * ReviewPage
 * Today's cards, one at a time: the question and the page it was written in;
 * Space shows the answer, then 1 Again · 2 Hard · 3 Good · 4 Easy grade it
 * and the next card shows at once. In every path, or one (/review?path=).
 */

const GRADES: ReadonlyArray<{ grade: Grade; message: 'again' | 'hard' | 'good' | 'easy'; color: string }> = [
  { grade: 1, message: 'again', color: 'red' },
  { grade: 2, message: 'hard', color: 'orange' },
  { grade: 3, message: 'good', color: 'teal' },
  { grade: 4, message: 'easy', color: 'blue' },
];

/** Keys typed into a field or a menu belong to it */
const typing = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || !!target.closest('[role="listbox"]'));

export function ReviewPage({ projectId }: { projectId: string | null }) {
  const t = useT();
  const router = useRouter();
  const projects = useProjects();
  const counts = useReviewCounts();
  const sitting = useReviewSitting(projectId);
  const path = projectId ? projects?.find((p) => p.id === projectId) : undefined;
  const title = path ? t('review.titleIn', { path: path.title }) : t('review.title');

  // The paths that have cards, to pick one
  const withCards = (projects ?? []).filter((p) => counts?.paths.some((c) => c.projectId === p.id && c.cards > 0));
  const filter = (
    <Select
      aria-label={t('review.filter.label')}
      size="sm"
      w={220}
      allowDeselect={false}
      value={projectId ?? ''}
      data={[{ value: '', label: t('review.filter.all') }, ...withCards.map((p) => ({ value: p.id, label: p.title }))]}
      onChange={(value) => router.push(value ? `/review?path=${encodeURIComponent(value)}` : '/review')}
    />
  );

  return (
    <AppFrame crumbs={[{ label: title }]} tools={filter}>
      <Stack px={{ base: 'md', sm: 'xl' }} pb="xl" maw={760} mx="auto" w="100%" gap="lg">
        <Title order={1} fz={30} lts={-0.5}>
          {title}
        </Title>
        {sitting.status === 'loading' ? (
          <Center py="xl">
            <Loader size="sm" aria-label={t('review.loading')} />
          </Center>
        ) : sitting.status === 'unavailable' ? (
          <Text c="dimmed" role="alert">
            {t('review.unavailable')}
          </Text>
        ) : sitting.card ? (
          <>
            <Group justify="space-between" gap="sm">
              <Text size="sm" c="dimmed" aria-live="polite">
                {t('review.left', { count: sitting.left })}
              </Text>
              {sitting.notice && (
                <Text size="sm" c="red" role="alert">
                  {sitting.notice}
                </Text>
              )}
            </Group>
            {/* Keyed by the card and the times it was graded, so a card asked again starts hidden */}
            <ReviewCard key={`${sitting.card.id}:${sitting.reviewed}`} card={sitting.card} onGrade={sitting.grade} />
          </>
        ) : sitting.reviewed > 0 ? (
          <Done reviewed={sitting.reviewed} />
        ) : (
          <Empty inPath={!!projectId && !counts?.paths.some((c) => c.projectId === projectId && c.cards > 0)} />
        )}
      </Stack>
    </AppFrame>
  );
}

function ReviewCard({ card, onGrade }: { card: DueCard; onGrade: (grade: Grade) => void }) {
  const t = useT();
  const { locale } = useLocale();
  const [shown, setShown] = useState(false);
  const question = useRef<HTMLDivElement>(null);
  const answer = useRef<HTMLDivElement>(null);
  const [now] = useState(() => new Date());
  const intervals = nextIntervals(card.state, now);

  // The new question is where the focus goes, so it is read out; after Space, the answer
  useEffect(() => {
    (shown ? answer : question).current?.focus({ preventScroll: true });
  }, [shown]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat || typing(event.target)) return;
      if (!shown && (event.key === ' ' || event.key === 'Enter')) {
        // A focused button already answers Space and Enter itself
        if (event.target instanceof HTMLButtonElement || event.target instanceof HTMLAnchorElement) return;
        event.preventDefault();
        setShown(true);
      } else if (shown && /^[1-4]$/.test(event.key)) {
        event.preventDefault();
        onGrade(Number(event.key) as Grade);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [shown, onGrade]);

  return (
    <Card withBorder radius="lg" padding="xl" className={classes.card}>
      <Stack gap="lg">
        <Anchor component={Link} href={pageHref(card.projectId, card.pageId)} size="sm" c="dimmed" aria-label={t('review.fromLabel', { page: card.pageTitle })}>
          {t('review.from', { page: card.pageTitle, path: card.pathTitle })}
        </Anchor>
        <div ref={question} tabIndex={-1} className={classes.face} aria-label={t('review.question')} role="group">
          <Text fz={24} fw={600} lh={1.4}>
            <InlineText text={card.question} blank={t('review.blank')} answer={shown && card.kind === 'cloze' ? card.answer : undefined} />
          </Text>
        </div>
        {shown ? (
          <>
            {card.kind === 'basic' && (
              <div ref={answer} tabIndex={-1} className={`${classes.face} ${classes.answer}`} aria-label={t('review.answer')} role="group">
                <Text fz={20} lh={1.5}>
                  <InlineText text={card.answer} blank={t('review.blank')} />
                </Text>
              </div>
            )}
            <div ref={card.kind === 'cloze' ? answer : undefined} tabIndex={-1} role="group" aria-label={t('review.grade.label')} className={classes.face}>
              <SimpleGrid cols={{ base: 2, xs: 4 }} spacing="sm">
                {GRADES.map(({ grade, message, color }) => {
                  const when = untilNext(intervals[grade], locale);
                  return (
                    <Button
                      key={grade}
                      variant="default"
                      style={{ '--grade-color': `var(--mantine-color-${color}-filled)` }}
                      onClick={() => onGrade(grade)}
                      aria-label={t('review.grade.full', { grade: t(`review.grade.${message}`), key: grade, when })}
                      className={classes.grade}
                      classNames={{ label: classes.gradeLabel }}
                    >
                      <span className={classes.gradeName}>
                        <Kbd size="xs" aria-hidden>
                          {grade}
                        </Kbd>
                        {t(`review.grade.${message}`)}
                      </span>
                      <Text component="span" size="xs" c="dimmed" aria-hidden>
                        {when}
                      </Text>
                    </Button>
                  );
                })}
              </SimpleGrid>
            </div>
          </>
        ) : (
          <Button size="md" variant="filled" onClick={() => setShown(true)} rightSection={<Kbd size="xs">Space</Kbd>} className={classes.show}>
            {t('review.show')}
          </Button>
        )}
      </Stack>
    </Card>
  );
}

function Done({ reviewed }: { reviewed: number }) {
  const t = useT();
  return (
    <Stack align="center" gap="md" py="xl" ta="center">
      <ThemeIcon size={56} radius="xl" variant="light" color="teal">
        <IconCircleCheck size={30} />
      </ThemeIcon>
      <Title order={2} fz={24}>
        {t('review.done.title')}
      </Title>
      <Text c="dimmed">{t('review.done.body', { count: reviewed })}</Text>
      <Button component={Link} href="/projects" variant="light">
        {t('review.done.back')}
      </Button>
    </Stack>
  );
}

/** Nothing due: how cards are written, with an example of each */
function Empty({ inPath }: { inPath: boolean }) {
  const t = useT();
  return (
    <Stack align="center" gap="md" py="xl" ta="center">
      <ThemeIcon size={56} radius="xl" variant="light" color="gray">
        <IconCards size={30} />
      </ThemeIcon>
      <Title order={2} fz={24}>
        {t('review.empty.title')}
      </Title>
      <Text c="dimmed" maw={520}>
        {t(inPath ? 'review.empty.noCards' : 'review.empty.body')}
      </Text>
      <Stack gap={6}>
        <Code>{t('review.empty.exampleCard')}</Code>
        <Code>{t('review.empty.exampleCloze')}</Code>
      </Stack>
    </Stack>
  );
}
