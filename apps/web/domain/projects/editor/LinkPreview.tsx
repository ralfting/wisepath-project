'use client';

import { useEffect, useState } from 'react';
import { Box, Group, Stack, Text } from '@mantine/core';

/**
 * LinkPreview
 * A small card for the link under the pointer: another page's title and
 * opening lines, or an external site's favicon, title and description.
 */

interface ExternalPreview {
  title: string | null;
  description: string | null;
  siteName: string;
  favicon: string | null;
}

const cache = new Map<string, Promise<ExternalPreview | null>>();

function loadPreview(href: string): Promise<ExternalPreview | null> {
  let pending = cache.get(href);
  if (!pending) {
    pending = fetch(`/api/link-preview?url=${encodeURIComponent(href)}`)
      .then((r) => (r.ok ? (r.json() as Promise<ExternalPreview>) : null))
      .catch(() => null);
    cache.set(href, pending);
  }
  return pending;
}

function plainExcerpt(markdown: string, max = 150): string {
  const text = markdown
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[#>*_`~[\]]|\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

export interface PreviewPage {
  id: string;
  title: string;
  content: string;
}

export type PreviewTarget = { kind: 'page'; title: string; page: PreviewPage | undefined } | { kind: 'url'; href: string };

export function LinkPreview({ target }: { target: PreviewTarget }) {
  if (target.kind === 'page') {
    return (
      <Stack gap={4}>
        <Text ff="var(--mantine-font-family-headings)" fs="italic" fz={15} lh={1.3}>
          {target.page?.title || target.title}
        </Text>
        <Text size="xs" c="dimmed" lineClamp={2}>
          {target.page ? plainExcerpt(target.page.content) || 'Nothing written yet.' : "This page doesn't exist yet."}
        </Text>
      </Stack>
    );
  }
  return <ExternalLinkPreview href={target.href} />;
}

function ExternalLinkPreview({ href }: { href: string }) {
  const [preview, setPreview] = useState<ExternalPreview | null | undefined>(undefined);
  let host = href;
  try {
    host = new URL(href).hostname.replace(/^www\./, '');
  } catch {
    // Keep the raw text
  }

  useEffect(() => {
    let alive = true;
    setPreview(undefined);
    loadPreview(href).then((p) => alive && setPreview(p));
    return () => {
      alive = false;
    };
  }, [href]);

  return (
    <Group gap={10} align="flex-start" wrap="nowrap">
      {preview?.favicon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview.favicon} alt="" width={16} height={16} style={{ marginTop: 2, borderRadius: 2, flexShrink: 0 }} />
      ) : (
        <Box w={16} h={16} mt={2} bg="atlas.1" style={{ borderRadius: 2, flexShrink: 0 }} aria-hidden="true" />
      )}
      <Stack gap={2} miw={0}>
        <Text size="sm" fw={700} lh={1.3} lineClamp={2}>
          {preview === undefined ? 'Loading preview…' : preview?.title || host}
        </Text>
        {preview?.description && (
          <Text size="xs" c="dimmed" lineClamp={2}>
            {preview.description}
          </Text>
        )}
        <Text size="xs" c="dimmed" truncate>
          {preview?.siteName ?? host}
        </Text>
      </Stack>
    </Group>
  );
}
