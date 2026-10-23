'use client';

import type { Path } from '@wisepath/domain/paths';
import { useT } from '@/i18n/I18nProvider';
import { Palette } from '@/ui/Palette/Palette';
import { BranchOptions } from './BranchOptions';

/**
 * Where a page moves to on the map: a searchable list, in the palette, of the
 * pages it can branch from, from the keyboard alone.
 */
export function BranchPicker({
  opened,
  path,
  pageId,
  onClose,
  onPick,
}: {
  opened: boolean;
  path: Path;
  pageId: string;
  onClose: () => void;
  onPick: (parentId: string) => void;
}) {
  const t = useT();
  return (
    <Palette opened={opened} onClose={onClose} label={t('page.related.move.title')} footer={t('page.related.move.keys')}>
      {/* The palette mounts its content on each opening, so every pick starts with an empty search */}
      <BranchOptions path={path} pageId={pageId} onPick={onPick} />
    </Palette>
  );
}
