'use client';

import { Text } from '@mantine/core';
import type { Page, Path } from '@wisepath/domain/paths';
import { MarkdownEditor } from '@/features/paths/editor';
import { PagePager } from '@/features/paths/page';
import { useT } from '@/i18n/I18nProvider';

const noop = () => {};

/** A public page's text, for reading only, with the pages before and after it underneath */
export function PublicPage({ path, page, onOpen }: { path: Path; page: Page; onOpen: (pageId: string) => void }) {
  const t = useT();
  return (
    <>
      {page.content.trim() ? (
        <MarkdownEditor
          key={page.id}
          content={page.content}
          onChange={noop}
          pages={path.pages}
          currentPageId={page.id}
          onOpenPage={onOpen}
          onLinkPage={noop}
          onCreatePage={noop}
          onCreatePageHere={noop}
          readOnly
        />
      ) : (
        <Text c="dimmed">{t('share.public.empty')}</Text>
      )}
      <PagePager path={path} page={page} onOpen={onOpen} />
    </>
  );
}
