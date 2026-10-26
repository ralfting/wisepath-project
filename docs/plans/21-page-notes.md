# 21. My notes on a page

Decided 2026-10-26 with the owner. Built in this plan.

## Why

A page's text is what the path teaches, and a path can be made public or published. What the learner writes for
themselves (the answer to a question the page asks, a reminder, a doubt) is not part of that: it must stay theirs
even when the page is read by anyone. Today the only place to write is the page's text, so an answer written there
goes public with the path.

## The experience

- Every page has **My notes** under its text, in the drawer over the map and on the full page: a markdown field of the
  reader's own, marked "Only you see these". Empty, it is one line ("Add a note"); once written, the notes show as
  they are, editable in place.
- The notes are each reader's, like the studied mark: the owner has theirs, and a learner who took a public path or
  was invited writes their own on the same pages. Nobody sees anyone else's notes, editors included.
- A reader may write notes on any page they can read; writing them never changes the page (its "edited" date stays).
- The public link page and the catalog never show notes: a visitor has none, and the API never sends someone's
  notes to anyone but them.
- Notes go when their page goes, and when the reader loses the path (as their studied marks do).
- Not in this plan: notes in search, in the Markdown download, or as review cards.

## How it works

- **Domain** (`packages/domain/src/paths`): `Page.notes` (optional string), the reader's own; absent with no reader or
  no notes. `PageEdit.notes`. `mayEditPage` treats `studied` and `notes` as the reader's own: an edit of only those
  needs read access. `editPage`/`updatePage` apply `notes` without touching `updatedAt`.
- **Database**: `page_notes` (`user_id`, `path_id`, `page_id`, `content`, `updated_at`), primary key
  `(user_id, path_id, page_id)`, foreign keys cascading from the user and the page. Empty notes delete the row.
- **API**: the path read loads the reader's notes beside their progress (none for a null reader, so the public and
  catalog reads carry none); `save` writes the reader's changed notes in the same transaction as the edit; losing
  access drops them with the progress.
- **Web**: `features/paths/page/PageNotes/`, rendered by `PageContent` below the editor, editable with read access.
  It reuses `MarkdownEditor` in a lean form (own placeholder; no video blocks, no page creation, no outline). The
  sync session waits for a pause before sending notes, as it does for the text.

## Checks

- Domain: a reader may edit notes, not notes with content; a notes edit keeps `updatedAt`.
- API, against the local database: owner and reader each read only their own notes; the public and catalog reads
  have none; deleting the page or losing access drops them; empty notes remove the row.
- Web: the sync session debounces notes; `PageNotes` shows for a reader and saves what they type.
