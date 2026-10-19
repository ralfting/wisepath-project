'use client';

import { Button } from '@mantine/core';
import { IconCheck, IconShare } from '@tabler/icons-react';
import { useShareButton } from './useShareButton';

interface ShareButtonProps {
  /** The address to share, relative to the site */
  href: string;
  /** What the share sheet calls it */
  title: string;
  labels: { share: string; copied: string };
}

/** Shares an address: the share sheet on a phone, the link copied elsewhere */
export function ShareButton({ href, title, labels }: ShareButtonProps) {
  const { state, operations } = useShareButton(href, title);
  return (
    <Button
      size="sm"
      variant="default"
      leftSection={state.copied ? <IconCheck size={14} /> : <IconShare size={14} />}
      onClick={() => void operations.share()}
    >
      {state.copied ? labels.copied : labels.share}
    </Button>
  );
}
