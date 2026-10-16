# 3. Spaced review

**Removed from the app (2026-10-16).** It was built as below, then taken out after the onboarding: review will be done differently. The API and its table stay; the web code is in the history.

## Why

Notes are written once and rarely read again; what was learned fades. A few minutes a day of being asked about one's own notes, at growing intervals, keeps it. The questions should come from the notes themselves, written where they belong, not in a separate flashcard app.

## The experience

- **Writing a card** is a line in any page: `What does Effect.fn add? :: A span named after the function`. Also `==text==` inside a sentence: the sentence becomes a fill-in-the-blank card. In the editor, card lines are marked with a small card icon in the margin.
- **Review** is a page in the sidebar with the number due today. One card at a time: the question (and the page it comes from); Space shows the answer; then **1 Again · 2 Hard · 3 Good · 4 Easy**. The next review is scheduled from that grade.
- Each card links to its page, to read the context.
- A path's root page (and its card on the home) shows how many cards it has and how many are due.
- Review can be limited to one path ("Review NestJS").

## Scope for v1

In: `::` and `==cloze==` cards, the Review page with keys 1–4, scheduling, counts in the sidebar and on paths.
Out: images in cards, multi-line answers, statistics charts, notifications (see open decisions).

## Model

- `packages/domain/src/review/`: `cardsIn(page)` parses a page's markdown into cards (ignoring code); a card's identity is a hash of its path, page and question, so editing the answer keeps its history and editing the question starts a new card.
- Scheduling: FSRS (the current standard, better than SM-2) through a small pure implementation in the domain, tested: `schedule(state, grade, now) -> state` with `{ due, stability, difficulty, reps, lapses, lastReview }`.
- Cards themselves are not stored: they are read from the pages. Only review state is.

## API

- Table `review_states (owner_id, card_id, project_id, page_id, due, stability, difficulty, reps, lapses, last_review)`.
- `ReviewApiGroup` under `/api/review`: `GET /due?projectId=` (the due cards: read from the pages, joined with their states; new cards count as due, a few a day), `POST /:cardId` (`{ grade }`, returns the new state).
- States of cards that no longer exist are kept (a card may come back) but never listed.

## Web

- `useCases/review/`: due cards, grading (optimistic: the next card shows at once).
- `features/review/ReviewPage.tsx` at `/review` (and `/review?path=`): the card, Space to reveal, 1–4 to grade, the page it comes from, "Done for today" at the end.
- Editor: a decoration marking `::` lines and `==cloze==` (the markdown is untouched).

## Checks

- Domain: parsing (`::`, cloze, code ignored, two cards on a page), card identity across edits, FSRS steps (intervals grow with Good, reset with Again).
- API: due list, grading, new-cards-per-day limit, another user's states invisible.
- Browser: write a card in a page, review it with the keyboard only, see the count change; axe.

## Open decisions

1. How many new cards a day by default (recommended 20), and is it per path or overall?
2. A daily nudge: nothing (recommended for v1), a badge only, or an email digest later?
