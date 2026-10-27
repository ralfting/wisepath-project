'use client';

import { Box, Button, Group, Kbd, Paper, Text, UnstyledButton } from '@mantine/core';
import { IconExternalLink } from '@tabler/icons-react';
import { useT } from '@/i18n/I18nProvider';
import { useHasKeyboard, useIsMac } from '@/ui/platform';
import { LinkPreview } from '../LinkPreview/LinkPreview';
import { CitationToggle } from './CitationToggle';
import classes from './MarkdownEditor.module.css';
import type { LinkCard as Card } from './MarkdownEditor.helpers';

interface LinkCardProps {
  card: Card;
  onAct: () => void;
  onClose: () => void;
  onToggleCitation: () => void;
}

/**
 * A link's card under it: an existing page or a site, the whole card opening it (a site in a new tab); a page not
 * made yet, with the button that makes it (and Cancel, when following the link asked for it). In text the learner
 * edits, a page's card also turns its link into a citation and back
 */
export function LinkCard({ card, onAct, onClose, onToggleCitation }: LinkCardProps) {
  const t = useT();
  const isMac = useIsMac();
  const hasKeyboard = useHasKeyboard();
  return (
    <Box
      data-link-card
      role={card.confirmCreate ? 'dialog' : undefined}
      aria-label={card.confirmCreate ? t('editor.card.create') : undefined}
      className={classes.card}
      style={{ top: card.top, left: card.left }}
    >
      {card.target.kind === 'url' ? (
        <Paper
          component="a"
          href={card.target.href}
          target="_blank"
          rel="noopener noreferrer"
          withBorder
          shadow="md"
          p="sm"
          pr={32}
          className={classes.cardLink}
          aria-label={t('editor.card.openInNewTab', { href: card.target.href })}
          onClick={onClose}
        >
          <IconExternalLink size={14} className={classes.cardOpens} aria-hidden />
          <LinkPreview target={card.target} />
          {/* The card hides once the pointer leaves, so it also teaches the click that opens the link from the text */}
          {hasKeyboard && (
            <Group gap={4} mt="xs" wrap="nowrap">
              <Kbd size="xs">{isMac ? '⌘' : 'Ctrl'}</Kbd>
              <Text size="xs" c="dimmed">
                {t('editor.card.newTabHint')}
              </Text>
            </Group>
          )}
        </Paper>
      ) : card.target.page && !card.chip ? (
        <Paper component="button" type="button" withBorder shadow="md" p="sm" className={classes.cardLink} onClick={onAct}>
          <LinkPreview target={card.target} />
        </Paper>
      ) : card.target.page ? (
        <Paper withBorder shadow="md" p="sm">
          <UnstyledButton className={classes.cardPage} onClick={onAct}>
            <LinkPreview target={card.target} />
          </UnstyledButton>
          {card.chip && <CitationToggle citation={card.chip.citation} onToggle={onToggleCitation} />}
        </Paper>
      ) : (
        <Paper withBorder shadow="md" p="sm">
          <LinkPreview target={card.target} />
          <Group gap="xs" mt="sm">
            <Button size="compact-sm" autoFocus={card.confirmCreate} onClick={onAct}>
              {t('editor.card.create')}
            </Button>
            {card.confirmCreate && (
              <Button size="compact-sm" variant="subtle" color="gray" onClick={onClose}>
                {t('common.actions.cancel')}
              </Button>
            )}
          </Group>
          {card.chip && <CitationToggle citation={card.chip.citation} onToggle={onToggleCitation} />}
        </Paper>
      )}
    </Box>
  );
}
