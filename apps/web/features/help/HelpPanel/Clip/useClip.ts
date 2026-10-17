'use client';

import { useContext, useRef, useState } from 'react';
import { useReducedMotion } from '@mantine/hooks';
import { useLocale } from '@/i18n/I18nProvider';
import { EnlargedContext } from '../HelpPanel.helpers';

/**
 * A help clip's view model: its files in the learner's language, whether it plays (not until pressed when less
 * motion is asked for), whether it failed to load, and showing it large from where it was
 */
export function useClip(name: string) {
  const { locale } = useLocale();
  const still = useReducedMotion();
  const video = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(!still);
  // Where the small clip was when it was enlarged; null while it isn't
  const [enlarged, setEnlarged] = useState<number | null>(null);
  const holdHelp = useContext(EnlargedContext);

  const enlarge = () => {
    video.current?.pause();
    setEnlarged(video.current?.currentTime ?? 0);
    holdHelp(true);
  };
  const shrink = () => {
    setEnlarged(null);
    holdHelp(false);
    if (!still) void video.current?.play();
  };

  return {
    video,
    state: { base: `/help/${name}.${locale}`, still, failed, playing, enlarged },
    operations: {
      enlarge,
      shrink,
      play: () => void video.current?.play(),
      fail: () => setFailed(true),
      played: () => setPlaying(true),
      paused: () => setPlaying(false),
    },
  };
}
