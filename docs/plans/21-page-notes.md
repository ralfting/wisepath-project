# 21. My notes on a page

Decided 2026-10-26 with the owner. Built in this plan.

## Why

A page's text is what the path teaches, and a path can be made public or published. What the learner writes for
themselves (the answer to a question the page asks, a reminder, a doubt) is not part of that: it must stay theirs
even when the page is read by anyone. Today the only place to write is the page's text, so an answer written there
goes public with the path. And a note is most useful next to the words it is about, as a comment is in Google Docs.

## The experience

- **On a passage.** Selecting text in a page, in the drawer or on the full page, shows **Note** in the selection
  bubble (also for a reader who may not edit the text). It opens a card in the margin, as a comment in Docs, to write
  the note. From then on the passage is highlighted; clicking it opens the card again, showing the note as it reads,
  with Edit, Delete and Close. The card sits beside the page, its top on the passage's, never over the text: right of
  the full page (which slides left when its margin is short), left of the drawer over the map, and under the passage
  only when the window has room for neither. It is 20rem wide, follows the passage as the page scrolls, and stays in
  the window. Edit swaps in the lean editor; Done, Esc or a click outside goes back to reading, then closes the card.
- **On the page.** A tab of its own, **My notes** with a lock and the number of notes (the drawer's third tab, after
  Related; on the full page, a second tab beside Content), marked "Only you see these", lists every note of the page
  in the order of the text: each with the passage it is on, quoted (clicking the quote shows the Content tab, scrolls
  to the passage and opens its card), then the note. The pencil writes a note in place, no card, with Delete, one at
  a time. **Add a note** adds one on the whole page, with no passage, written the same way; left blank, it is not
  kept. With no notes, the tab says where they come from.
- **When the text changes.** A note holds the words it was made on, with a few words on each side, not a position:
  the owner may keep writing and the note stays on its words. When those words are gone, the note stays in the list
  marked "Passage removed", with the quote as it was.
- The notes are each reader's, like the studied mark: the owner has theirs, and a learner who took a public path or
  was invited writes their own on the same pages. Nobody sees anyone else's notes, editors included.
- Writing a note never changes the page (its "edited" date stays). The public link page and the catalog never show
  notes: a visitor has none, and the API never sends someone's notes to anyone but them.
- Notes go when their page goes, and when the reader loses the path (as their studied marks do).
- Not in this plan: notes in search, in the Markdown download, or as review cards.

## How it works

- **Domain** (`packages/domain/src/paths/notes.ts`): `PageNote` `{ id, quote?, body, createdAt, updatedAt }`, with a
  branded `NoteId` made by the client. `TextQuote` `{ exact, prefix, suffix }` (the W3C Web Annotation text quote
  selector): the selected text and up to 32 characters around it. `locateQuote(text, quote)` finds where a quote sits
  in the page's text now (the occurrence whose surroundings match best), or nothing. `Page.notes` (optional array):
  the reader's own, absent with no reader. Two commands, `WriteNote` (create or replace, by id) and `RemoveNote`,
  allowed with read access; neither touches the page's `updatedAt`.
- **Database**: `page_notes` (`user_id`, `path_id`, `page_id`, `id`, `quote_exact`, `quote_prefix`, `quote_suffix`,
  `body`, `created_at`, `updated_at`), primary key `(user_id, path_id, page_id, id)`, foreign keys cascading from the
  user and the page.
- **API**: `PUT /paths/:pathId/pages/:pageId/notes/:noteId` (idempotent) and `DELETE` of the same address, with read
  access. The path read loads the reader's notes beside their progress (none for a null reader, so the public and
  catalog reads carry none); losing access drops them with the progress.
- **Web**: the sync session sends the two commands like any other, a burst of typing in one note as one write. The
  editor gets a `NoteHighlights` extension: decorations over each located quote, recomputed as the text changes, in
  a read-only editor too, with a click that opens the note's card. The quote is taken from the editor's text (what
  the reader sees), not the markdown. `features/paths/page/PageNotes/` holds the Notes tab, the card and `usePageNotes`,
  which the drawer's panel and the full page call once for both tabs.

## Checks

- Domain: `locateQuote` with repeats, edits around the quote, a removed quote; the commands for a reader; neither
  changes `updatedAt`.
- API, against the local database: owner and reader each read only their own notes; the public and catalog reads
  have none; deleting the page or losing access drops them; a repeated `PUT` leaves one note.
- Web: highlights follow the text as it is edited and vanish for a removed passage, which the list marks; the bubble
  offers Note to a reader; the card writes and deletes.
