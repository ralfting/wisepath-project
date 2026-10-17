'use client';

import { ActionIcon, Button, Modal, Tooltip } from '@mantine/core';
import { IconArrowsMaximize, IconPlayerPlayFilled } from '@tabler/icons-react';
import { useT } from '@/i18n/I18nProvider';
import classes from '../HelpPanel.module.css';
import { useClip } from './useClip';

/**
 * A few seconds of the app doing it, muted and looping like a GIF. With less
 * motion asked for, it waits for a press. A clip that can't load leaves the
 * text on its own. A press on it (or its corner button) shows it large, with
 * the player's controls, from where it was.
 */
export function Clip({ name, label }: { name: string; label: string }) {
  const t = useT();
  const { video, state, operations } = useClip(name);

  if (state.failed) return null;
  const { base, still, playing, enlarged } = state;

  return (
    <div className={classes.clip}>
      <video
        ref={video}
        src={`${base}.mp4`}
        poster={`${base}.jpg`}
        autoPlay={!still}
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={label}
        onError={operations.fail}
        onPlay={operations.played}
        onPause={operations.paused}
        onClick={operations.enlarge}
        className={classes.video}
      />
      <Tooltip label={t('help.enlarge')} withArrow>
        <ActionIcon variant="white" color="dark" size="md" radius="md" aria-label={t('help.enlargeClip', { title: label })} className={classes.enlarge} onClick={operations.enlarge}>
          <IconArrowsMaximize size={15} />
        </ActionIcon>
      </Tooltip>
      {!playing && (
        <Button
          size="xs"
          variant="white"
          leftSection={<IconPlayerPlayFilled size={12} />}
          className={classes.play}
          onClick={operations.play}
        >
          {t('help.play')}
        </Button>
      )}
      <Modal
        opened={enlarged !== null}
        onClose={operations.shrink}
        title={label}
        centered
        size="auto"
        radius="lg"
        // Above Help (260)
        zIndex={280}
        closeButtonProps={{ 'aria-label': t('common.actions.close') }}
      >
        <video
          src={`${base}.mp4`}
          poster={`${base}.jpg`}
          autoPlay={!still}
          muted
          loop
          playsInline
          controls
          aria-label={label}
          onLoadedMetadata={(event) => {
            event.currentTarget.currentTime = enlarged ?? 0;
          }}
          className={classes.large}
        />
      </Modal>
    </div>
  );
}
