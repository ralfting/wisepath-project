import type { Page, Path } from '@wisepath/domain/paths';
import { trailTo } from '@wisepath/domain/paths';
import { displayTitle } from '@/i18n/title';
import type { PathActions, SaveState } from '@/useCases/paths';
import type { Translate } from '@/i18n/I18nProvider';
import type { Crumb } from '@/features/shell';
import { mapHref, mapWithPageHref } from '@/shared/routes';
import type { EditorFocus } from '@/features/paths/editor';

/** My paths › map › the pages the branch passes through › this page */
export function pageCrumbs(path: Path, page: Page, t: Translate): Crumb[] {
  const between = trailTo(path, page.id).slice(1, -1);
  return [
    { label: t('page.crumbs.myPaths'), href: '/paths' },
    { label: path.title, href: mapHref(path.id) },
    ...between.map((p) => ({ label: displayTitle(p), href: mapWithPageHref(path.id, p.id) })),
    ...(page.id === path.rootPageId ? [] : [{ label: displayTitle(page) }]),
  ];
}

export interface PageSheetProps {
  path: Path;
  page: Page;
  store: PathActions;
  /** Whether the latest edits reached WisePath */
  save: SaveState;
  isFresh?: boolean;
  onOpenPage: (pageId: string) => void;
  /** The graph button: a link to the map, or (in the expanded drawer) going back to it */
  showOnMap: { href: string } | { onClick: () => void };
  /** After deleting, with the page it branched from */
  onDeleted: (backPageId: string) => void;
  /** The page this one was reached from, inside the drawer */
  back?: { page: Page; onClick: () => void };
  /** Puts the cursor in the text on open */
  focusEditor?: EditorFocus | null;
  onCursor?: (pos: number) => void;
}
