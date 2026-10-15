# 7. Page templates

Needs [plan 5](05-i18n.md) (titles and hints come in the learner's language).

## Why

A blank page doesn't say where to start, and notes end up as a pile in the order they were found. A template lays out the page in the order a subject is best understood, from the concept to the practice, so each page is studied (and later reread) the same way.

## The order

Every template follows the same order:

1. **In one line** — what it is, in a sentence
2. **Why it exists** — the problem it solves, what came before
3. **How it works** — the mechanism
4. **Example** — the smallest real case
5. **Practice** — something to do with it
6. **Pitfalls** — what goes wrong, and how to tell
7. **Questions** — `Question :: Answer` lines, for [spaced review](03-spaced-review.md)
8. **Sources** — where it came from

## The family

Same order; the middle fits the kind of page.

| Template | Differs in |
| --- | --- |
| **Concept** | The eight sections as above |
| **Video** | The video's address first (pasted in the template's first line); **How it works** is the timestamped notes under the video |
| **Article** | The article's address first; **How it works** collects quoted passages |
| **Tool** | **How it works** is **Install and use**, with a code block for the setup |

Templates the learner edits or adds come in a later step.

## The experience

- **On an empty page**, where the text would be, a quiet row: "Start with: Concept · Video · Article · Tool · Blank". A click, or ← → and Enter, fills the page; typing anything makes the row go. Nothing is ever applied on its own.
- **`/template`** anywhere in the text inserts one where the cursor is.
- **Hints, not text:** under each heading, while its section is empty, a grey hint ("What problem does it solve? What did people do before?") that is not saved: the markdown has only the headings and what the learner writes.
- **Following the order:** the outline rail on the right marks each template section written or empty; **⌘↓ / Ctrl+↓** moves the cursor to the next empty section; a page with a template opens with the cursor in its first empty section.
- No counts of sections on the map or list: an empty section isn't always missing work.
- Headings and hints are in the learner's language; a page keeps the language it was filled in.

## How it works

- `apps/web/features/editor/templates/`: each template is data (its sections: heading key, hint key, and starting content such as the video line or code block) and builds markdown in the current language.
- Template sections are recognised by heading text, in either language, so hints and the rail work on pages filled before a language switch, and on pages written by hand with the same headings.
- Hints are a ProseMirror decoration on an empty paragraph under a recognised heading (like the existing placeholder).
- The empty-page row is a widget shown while the document is empty and the page is editable.
- ⌘↓ is a keyboard shortcut in the editor: the next recognised section whose body is empty.

## Checks

- Unit: each template's markdown in both languages; recognising sections by heading; "next empty section".
- Browser: empty page → row → Video → the page has the sections, cursor in the first empty one, hints shown and not saved; ⌘↓ moves along; `/template` mid-page; keyboard only; axe light and dark.
