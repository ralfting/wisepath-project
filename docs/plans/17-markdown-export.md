# 17. Download paths as Markdown

Decided 2026-10-18 ([strategy](../strategy/05-backlog.md), P0.1; decision G9). Built in this plan.

## Why

A learner cannot trust a notebook they cannot leave. Pages are already stored as markdown, so taking them out is
cheap: a zip with one `.md` file per page, which opens in Obsidian or any editor with the `[[links]]` working.

## The experience

- **Download as Markdown** in a path's menu on My paths (owner only): `<Path title>.zip`, a folder named after the
  path with one file per page, named after its title (`Hooks.md`). The text is exactly what was written.
- **Download my paths** in the account menu: `WisePath.zip`, one folder per path the learner owns.
- Only paths the learner owns. Paths shared with them or taken to study are someone else's content; downloading
  them would be the copy that sharing never makes ([plan 14](14-public-and-shared-paths.md)).
- Nothing else is exported: progress, projects and the Inbox stay in the app for now.

## How it works

- **Domain** (`packages/domain/src/paths/export.ts`): `markdownFiles(path)` gives one `{ name, content }` per page;
  a title becomes a file name that every system accepts (no `/ \ : * ? " < > |`, no trailing dots or spaces), and two
  titles that end up the same get ` (2)`, ` (3)`. `exportFolders(paths)` does the same with one folder per path.
  Unit tested.
- **Contract** (`PathsApi`): `GET /paths/export` (`exportAll`) and `GET /paths/:pathId/export` (`export`), success a
  `Uint8Array` as `application/zip`; `export` answers `PathNotFound` without the owner's access.
- **API**: use cases in `apps/api/src/paths/application/exports.ts` (`manages` for one path; the owned paths of
  `listFor` for all); the controller zips the files with `fflate` (a direct dependency of the API: small, no
  dependencies, MIT) and sends them as an attachment.
- **Web**: the two links are plain downloads to the API (`useCases/paths/exports.ts` builds their addresses), so the
  browser sends the session cookie and saves the file; no client code reads the zip.

## Checks

- Domain: names cleaned and made unique; root and pages present; content unchanged.
- API, against the local database: the owner gets a zip whose files are the path's pages; a reader who took the path
  and a stranger get `PathNotFound`; the account download holds the owned paths only.
- E2E: a learner downloads a path from My paths and the file is a zip named after it.
