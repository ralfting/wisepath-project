# 22. Activities on a page

Decided 2026-10-26 with the owner, from an investigation and a throwaway prototype. Built in this plan.

## Why

A page often asks the learner to do something: "write two things you like doing", an exercise, a task. Today that
is a line of text like any other, so nothing tells the learner it is there to be done, and in a learning path a page
can be marked studied without doing it. An activity should stand out as one, and in a learning path its page should
count as studied only once it is done.

Progress stays one completion state per page (PRODUCT.md, principle 4): activities are the conditions for marking
a page studied, never a second count. The map's progress still counts pages.

## The experience

- **Writing one.** `/activity` in the editor (pt-BR `/atividade`), or a quote whose first line is `[!activity]`, as
  callouts are written:

  ```
  > [!activity]
  > Write two things you like doing when you read.
  ```

  It is a block of its own, with a clipboard icon and the label **Activity**, and any text inside (lines, a list).
  A page may hold any number.
- **In a study.** The block shows with `IconClipboardText` and nothing to tick: a study has no progress. On the map
  and in the list, a page with activities shows a small dimmed `IconClipboardText` after its title.
- **In a learning path.** Each block's header has **Mark as done**; done, the block turns teal with
  `IconClipboardCheck` and the button reads **Done**. Open blocks are neutral: a grey border and a dimmed icon (not
  a new colour; violet is a module colour, blue is for actions and the page up next).
  - The studied control, while activities are open, reads **1 activity left** / **2 activities left** with the
    clipboard icon, in neutral grey. A click scrolls to the first open activity and rings it. Once the last is done
    it is **I've studied this** again. No disabled button: it says what is missing and goes there, from the keyboard
    too.
  - Unticking an activity on a studied page unmarks the page: studied means its activities are done.
  - Adding an activity to a page someone has already studied leaves their mark: the condition applies when marking.
  - On the map and in the list, the clipboard icon is grey while any activity is open and teal with a check once all
    are done.
- Ticks are each reader's own, like the studied mark: the owner, an editor, a reader of a shared path and a learner
  who took a public path each tick their own, and nobody sees anyone else's. A visitor on the public link and the
  catalog see the blocks with the icon and nothing to tick.
- The sample path's "A reading journal" gets one activity, so a first visit shows the feature.
- Not in this plan: answering an activity in My notes (plan 21) from a button on the block. Worth doing next: the
  answer is what the learner writes for themselves, and notes already keep it private.

## How it works

- **Identity.** An activity is read from the page's markdown, never stored as an entity (as review cards were,
  `packages/domain/src/review/cards.ts`). Its id is a hash of the path, the page and its text with white space
  collapsed (`cyrb53`, as `cardId`), so it survives inserting other activities around it. Rewording one makes a new
  activity, open for everyone; its old ticks are ignored. The editor does not hash: the domain lists a page's
  activities in text order and the editor gives the nth activity block the nth id, so markdown formatting inside one
  never makes the two disagree.
- **Domain** (`packages/domain/src/paths/activities.ts`): `ActivityId` (branded), `activitiesIn(pathId, page)` →
  `{ id, text }[]` in text order, code blocks skipped, the marker read as `apps/web/shared/callouts.ts` reads it (the
  domain cannot import the web, so the marker rule moves to the domain and the web imports it from there),
  `openActivities(path, page)`. `Page.done`:
  optional array of `ActivityId`, the reader's ticks, absent with no reader. `PageEdit.done`: the full set of ticks
  for the page (idempotent; the sync merges as for `studied`). `editPage`, in a learning path, refuses `studied: true`
  while activities are open, and sets `studied: false` when a tick is removed from a studied page. `mayEditPage`
  lets an edit of only `studied` and `done` through with read access. Neither changes `updatedAt`.
- **Database**: `activity_progress` (`user_id`, `path_id`, `page_id`, `activity_id`, `done_at`), primary key on the
  first four, cascading from the user and the page, as `page_progress`.
- **API**: the path read joins the reader's ticks beside their progress (none for a null reader); `saveProgress`
  diffs `done` as it does `studied`; losing access drops them with the progress (`DrizzleMemberStore`). The catalog
  and public reads carry none. The `PATCH` page endpoint already carries `PageEdit`, so the contract only grows the
  field.
- **Web**:
  - Editor: `CALLOUT_KINDS` gains `activity`; `CalloutView` renders it with its own header and, given the editor's
    `activities` context (`{ ids, done, progress, onToggle }`, read through the context ref like `notes`), the
    button. The kind menu offers it among the callouts. A slash command inserts one. The catalog's `remarkCallouts`
    renders the kind as a static block with the icon.
  - `StudiedToggle` takes the number of open activities and a way to show the first; the drawer and the full page
    pass them from one helper, so the two cannot drift.
  - Map: the badge in `MindNode` and `MapList` (and search results and orphans, which show status icons too), its
    width added to `nodeSize()` and its words to `labelOf`.
  - Help: a topic under the page screen. `docs/FEATURES.md`: the feature and `/activity`.

## Checks

- Domain: `activitiesIn` with several activities, formatting inside, code blocks ignored, rewording; the gate in a
  learning path and not in a study; unticking unmarks; a reader may tick; `updatedAt` unchanged.
- API, against the test database: each reader reads only their own ticks; the public and catalog reads have none;
  `studied: true` with an open activity is refused; deleting the page or losing access drops the ticks.
- Web: the block in a study and a learning path, in light and dark, both languages, axe clean; the studied control
  counts down and scrolls to the open activity; the map badge in both kinds; a reader ticks on someone else's path.
