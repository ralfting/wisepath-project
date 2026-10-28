---
id: BUG-011
title: A YouTube video's link preview has no title, so the outline lists it as "Video"
area: api/links
date: 2026-10-28
tags: [links, fetch]
---

# BUG-011: A YouTube video's link preview has no title, so the outline lists it as "Video"

## Symptoms

A page with a YouTube video, opened full width: the outline ("On this page") lists the video as "Vídeo" (pt-BR) or
"Video" instead of its title. Every other place that reads a YouTube link's preview shows no title either. The API
answers it directly, signed in:

```
GET /api/link-preview?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ
{"title":null,"description":null,"siteName":"youtube.com","favicon":"https://www.youtube.com/s/desktop/46f6e5ef/img/favicon.ico"}
```

`youtu.be`, `shorts` and `embed` addresses answer the same. Other sites keep their titles.

## Root Cause

`apps/api/src/links/infrastructure/SafePageFetcher.ts` reads at most `MAX_BYTES` (512 KB) of a page, assuming the
`<head>` comes first. YouTube's watch page (1.4 MB, fetched with the API's user agent) puts its `<title>` at byte
774570 and `og:title` at 776447, after about 770 KB of inline scripts. `readPreview` never sees either and answers
`title: null`. The favicon `<link>` is at byte 6045, which is why the preview still had an icon.

## Resolution

- Files changed: `apps/api/src/links/application/links.ts`, `apps/api/src/links/application/PageFetcher.ts`,
  `apps/api/src/links/infrastructure/SafePageFetcher.ts`, `apps/api/test/links.test.ts`
- Commit: `fix(api): read youtube video titles from oembed instead of the watch page`
- For an address `youTubeId` (`@wisepath/domain/inbox`) recognises, `previewLink` asks YouTube's oEmbed endpoint
  about the canonical watch URL through `PageFetcher.fetchJson`. That method makes the same checks as the page fetch:
  public host, time, size and redirects. The answer's `title` is decoded with a Schema. If the request fails or the
  answer has no title (a private or removed video), the preview is YouTube's without a title, not an error.
  `MAX_BYTES` is unchanged.

## Prevention

`apps/api/test/links.test.ts`: "reads a YouTube video's title from YouTube's oEmbed, whichever way its address is
written" (watch, `youtu.be`, `m.`, `shorts` and `embed` addresses all ask for the same oEmbed address and answer its
title) and "answers a YouTube video without a title when oEmbed has none for it". Without the fix, both take the page
path and fail.
