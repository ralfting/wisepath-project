'use client';

import { Box, Group, Stack, Text } from '@mantine/core';
import { useT } from '@/i18n/I18nProvider';
import { useLinkPreview } from '@/useCases/paths';

/** A web link's card: the site's icon, its title and description once fetched, the bare host until then */
export function ExternalLinkPreview({ href }: { href: string }) {
  const t = useT();
  const state = useLinkPreview(href);
  const preview = state.status === 'ready' ? state.preview : null;
  let host = href;
  try {
    host = new URL(href).hostname.replace(/^www\./, '');
  } catch {
    // Keep the raw text
  }

  return (
    <Group gap={10} align="flex-start" wrap="nowrap">
      {preview?.favicon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview.favicon} alt="" width={16} height={16} style={{ marginTop: 2, borderRadius: 2, flexShrink: 0 }} />
      ) : (
        <Box w={16} h={16} mt={2} bg="gray.1" style={{ borderRadius: 2, flexShrink: 0 }} aria-hidden="true" />
      )}
      <Stack gap={2} miw={0}>
        <Text size="sm" fw={700} lh={1.3} lineClamp={2}>
          {state.status === 'loading' ? t('editor.preview.loading') : preview?.title || host}
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
