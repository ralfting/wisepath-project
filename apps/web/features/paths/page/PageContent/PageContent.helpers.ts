import type { Page } from '@wisepath/domain/paths';

export interface PageActions {
  updatePage: (pageId: string, patch: Partial<Pick<Page, 'title' | 'content' | 'studied'>>) => void;
  /** A title starts being edited: links to the page follow it as it is typed */
  beginRename: (pageId: string) => void;
  /** Rewrites [[Old]] links across the path after a rename, ending it */
  renameLinks: (oldTitle: string, newTitle: string) => void;
  openPage: (pageId: string) => void;
  /** Creates the page a [[link]] already points to, and opens it */
  createLinkedPage: (title: string) => void;
  /** Creates the page a [[link]] already points to, and stays here */
  createPage: (title: string) => void;
}
