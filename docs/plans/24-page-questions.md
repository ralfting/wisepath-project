# 24. Questions on a page

Decided 2026-10-27 with the owner. Built in this plan.

## Why

Learners already use My notes (plan 21) to answer questions a page asks: the question sits in the page, the answer
in a note that has to quote it to stay beside it. A question should be a block of its own, with the answer field
right under it, and the answer should be the reader's, never the path's: the owner, a reader of a shared path and a
learner who took a public path each write their own, and nobody sees anyone else's.

Plan 22 named this as the next step ("answering an activity"). A question is the same idea with words for an answer:
the page asks, the reader answers, and in a learning path the page counts as studied only once it is answered.

## The experience

- **Writing one.** `/question` in the editor (pt-BR `/pergunta`), or a quote whose first line is `[!question]`, as
  callouts are written:

  ```
  > [!question]
  > What makes a habit last?
  ```

  It is a block with a question icon and the label **Question**; the text inside is the question, editable like any
  callout's. Under it, outside the editable text, is **Your answer**: a plain textarea that grows with what is
  written. A page may hold any number.
- **Answering.** The textarea saves by itself as the reader types (debounced, and on blur), through the page sync,
  with the save status the page already shows. Plain text: markdown typed in it is kept as typed, not rendered.
  Clearing it removes the answer. The field is there in a study and in a learning path alike, for anyone signed in
  who may read the path, in a page they may only read too (the block's text stays read-only for them).
- **In a learning path.** An unanswered question holds the page as an open activity does (plan 22):
  - The studied control counts what is left: **1 activity left**, **1 question to answer**, or, mixed, **3 left to
    do**. A click scrolls to the first open one, rings it, and for a question puts the cursor in its answer.
  - Clearing the answer of a question on a studied page unmarks the page, as unticking an activity does.
  - A question added to a page someone already studied leaves their mark.
  - On the map and in the list, the activity badge stands for both: it shows when a page has activities or questions,
    grey while any is open, teal with a check once all are done.
- **Without a reader.** A visitor on the public link and the catalog see the block with the question and no field.
- **Rewording.** The author fixing a question's words keeps every reader's answer with it (see Identity). Deleting the
  question hides its answers; restoring the same words brings them back.
- Not in this plan: answers in the markdown export, answers as review cards, a list of all my answers.

## How it works

- **Identity.** As an activity: read from the page's markdown, never stored as an entity. `QuestionId` is a hash of
  `question`, the path, the page and the question's words with white space collapsed, plus a repeat index for the same
  words twice. The editor does not hash: the nth question block takes the domain's nth id.
  Rewording would make a new id and orphan the answers, so when the API writes a page's new content it re-keys every
  reader's answers for questions reworded in place: `rewordedQuestions(pathId, before, after)` pairs the questions by
  position, and only when the page holds as many questions before and after; a pair counts only when its old id is
  gone from the new text and its new id was not in the old one (so moving questions around renames nothing). Typing
  a question letter by letter re-keys once per save, each step one position apart from nothing.
- **Domain** (`packages/domain/src/paths/`):
  - `callouts.ts`: `CALLOUT_KINDS` gains `question`.
  - `activities.ts` reads callouts of one kind through one helper; `questionsIn(pathId, page)` sits beside
    `activitiesIn` on it. `QuestionId` (branded, as `ActivityId`).
  - `Page.answers`: optional array of `{ question: QuestionId, body }`, the reader's own, absent with no reader or
    none written. `Answer.body` is at most 20000 characters and never blank (blank is no answer).
  - `PageEdit.answers`: changes, each `{ question, body }`, applied in order; a blank body removes the answer. Kept
    only for questions the page has, as ticks are. Capped like ticks.
  - The learning-path gate in `setProgress` takes open activities and unanswered questions together: one list of what
    the page asks (`openTasks(path, page)`, replacing `openActivities`), so the studied control, the gate and the map
    badge read the same thing. `ActivitiesOpen` keeps its name for the refusal: it means "what the page asks is open".
  - `mayEditPage` lets an edit of only `studied`, `ticks` and `answers` through with read access. None changes
    `updatedAt`.
- **Database**: `question_answers` (`user_id`, `path_id`, `page_id`, `question_id`, `body`, `updated_at`), primary key
  on the first four, cascading from the user and the page, as `activity_progress`.
- **API**: the path read joins the reader's answers beside their ticks (`readersOwn.ts`); `saveReadersOwn` writes the
  answers that differ (upsert, delete for removed); losing access drops them with the progress
  (`DrizzleMemberStore`); the content write re-keys reworded questions for every reader. The catalog and public reads
  carry none. The contract only grows through `PageEdit` and `Page`.
- **Web**:
  - Editor: `CalloutView` renders `question` with a `QuestionBlock` in `ui/` (as `ActivityBlock`), its answer field
    given the editor's questions context (`{ ids, answers, onAnswer }`, a React context like
    `EditorActivitiesContext`). The answer field is `contentEditable={false}` and stops key events from reaching the
    editor. The kind menu offers it; a slash command inserts one; the catalog's `remarkCallouts` renders it static.
  - The page sync queues answer changes as it queues ticks, the last per question winning.
  - `StudiedToggle` takes the open tasks; the drawer and the full page pass them from the one helper.
  - Map: `ActivityBadge` counts tasks, not only activities.
  - Help: the topic on activities covers questions. `docs/FEATURES.md` and `PRODUCT.md`: the block and `/question`.

## Checks

- Domain: `questionsIn` with several questions, formatting, code ignored, repeats; `rewordedQuestions` for a reword,
  a move, an add, a delete; answers kept only for current questions; blank removes; the gate with an unanswered
  question in a learning path and not in a study; clearing unmarks; a reader may answer; `updatedAt` unchanged.
- API, against the test database: each reader reads only their own answers; public and catalog reads have none;
  rewording a question keeps two readers' answers; `studied: true` with an unanswered question is refused; deleting
  the page or losing access drops the answers.
- Web: the block in a study and a learning path, light and dark, both languages, axe clean; typing an answer saves
  and survives a reload; another account sees its own empty field; the studied control counts a question and jumps
  to its field; a visitor on the public link sees no field.
