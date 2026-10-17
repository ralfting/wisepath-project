'use client';

import { useContext, useRef, useState } from 'react';
import { ActionIcon, Button, Modal, Tooltip } from '@mantine/core';
import { useReducedMotion } from '@mantine/hooks';
import { IconArrowsMaximize, IconPlayerPlayFilled } from '@tabler/icons-react';
import { useLocale, useT } from '@/i18n/I18nProvider';
import classes from './HelpPanel.module.css';
import { EnlargedContext } from './HelpPanel.helpers';

/**
 * A few seconds of the app doing it, muted and looping like a GIF. With less
 * motion asked for, it waits for a press. A clip that can't load leaves the
 * text on its own. A press on it (or its corner button) shows it large, with
 * the player's controls, from where it was.
 */
export function Clip({ name, label }: { name: string; label: string }) {
  const { locale } = useLocale();
  const t = useT();
  const still = useReducedMotion();
  const ref = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(!still);
  // Where the small clip was when it was enlarged; null while it isn't
  const [enlarged, setEnlarged] = useState<number | null>(null);
  const holdHelp = useContext(EnlargedContext);

  if (failed) return null;
  const base = `/help/${name}.${locale}`;

  const enlarge = () => {
    ref.current?.pause();
    setEnlarged(ref.current?.currentTime ?? 0);
    holdHelp(true);
  };
  const shrink = () => {
    setEnlarged(null);
    holdHelp(false);
    if (!still) void ref.current?.play();
  };

  return (
    <div className={classes.clip}>
      <video
        ref={ref}
        src={`${base}.mp4`}
        poster={`${base}.jpg`}
        autoPlay={!still}
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={label}
        onError={() => setFailed(true)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onClick={enlarge}
        className={classes.video}
      />
      <Tooltip label={t('help.enlarge')} withArrow>
        <ActionIcon variant="white" color="dark" size="md" radius="md" aria-label={t('help.enlargeClip', { title: label })} className={classes.enlarge} onClick={enlarge}>
          <IconArrowsMaximize size={15} />
        </ActionIcon>
      </Tooltip>
      {!playing && (
        <Button
          size="xs"
          variant="white"
          leftSection={<IconPlayerPlayFilled size={12} />}
          className={classes.play}
          onClick={() => void ref.current?.play()}
        >
          {t('help.play')}
        </Button>
      )}
      <Modal
        opened={enlarged !== null}
        onClose={shrink}
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
