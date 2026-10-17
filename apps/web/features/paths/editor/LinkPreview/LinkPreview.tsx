'use client';

import { Stack, Text } from '@mantine/core';
import { useT } from '@/i18n/I18nProvider';
import { ExternalLinkPreview } from './ExternalLinkPreview';

/**
 * LinkPreview
 * A small card for the link under the pointer: another page's title and
 * opening lines, or an external site's favicon, title and description.
 */

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
  const t = useT();
  if (target.kind === 'page') {
    return (
      <Stack gap={4}>
        <Text fw={600} fz={14} lh={1.3}>
          {target.page?.title || target.title}
        </Text>
        <Text size="xs" c="dimmed" lineClamp={2}>
          {target.page ? plainExcerpt(target.page.content) || t('editor.preview.empty') : t('editor.preview.missing')}
        </Text>
      </Stack>
    );
  }
  return <ExternalLinkPreview href={target.href} />;
}
