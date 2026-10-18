# Content

Paths written by WisePath's owner and kept here as Markdown, one folder per path, so they are reviewed and versioned
like code. `scripts/publish-path.mjs` writes a folder into an account through the API, makes it readable by its
link, asks to publish it to the catalog and approves it when the account is an administrator (`ADMIN_EMAILS` on
the API); running it again updates the same path.

| Folder | Path |
|---|---|
| [como-usar-o-wisepath](como-usar-o-wisepath/) | Como usar o WisePath: a learning path in Portuguese on using the app |

Each folder holds `path.json` (kind, description, audience, language, and which pages are modules) and one file per
page, the root first by name (`00-…`), each starting with `# Title`. Check a folder without sending anything:
`node scripts/publish-path.mjs content/<folder> --check`.
