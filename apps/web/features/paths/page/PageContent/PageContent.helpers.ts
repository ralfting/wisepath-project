import type { Page } from '@wisepath/domain/paths';
import type { PathActions } from '@/useCases/paths';

/** What the page's title and text editors can do */
export interface PageActions {
  updatePage: (pageId: string, patch: Partial<Pick<Page, 'title' | 'content' | 'studied' | 'notes'>>) => void;
  /** A title starts being edited: links to the page follow it as it is typed */
  beginRename: (pageId: string) => void;
  /** Rewrites [[Old]] links across the path after a rename, ending it */
  renameLinks: (oldTitle: string, newTitle: string) => void;
  /** `alternate`: opened with Cmd/Ctrl, in the screen's other way (the full page, or the drawer) */
  openPage: (pageId: string, alternate?: boolean) => void;
  /** Creates the page a [[link]] already points to, and opens it */
  createLinkedPage: (title: string) => void;
  /** Creates the page a [[link]] already points to, and stays here */
  createPage: (title: string) => void;
}

/** What the page's title and text can do, over the path's store; `open` is how this screen opens another page */
export const pageActionsFor = (store: PathActions, open: (pageId: string, alternate?: boolean) => void): PageActions => ({
  updatePage: store.updatePage,
  beginRename: store.beginRename,
  renameLinks: store.renameLinks,
  openPage: open,
  createLinkedPage: (title) => open(store.createPage(title).id),
  createPage: (title) => void store.createPage(title),
});
