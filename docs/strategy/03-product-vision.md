# C. Revised product vision

A proposal. Nothing here changes `PRODUCT.md` until the owner approves it (decisions in
[07-open-decisions.md](07-open-decisions.md)).

## Value proposition

*A place to turn what you study into a path you can understand, connect and come back to; and to study the paths
others wrote, with your own progress.*

## First audience to validate

Decided 2026-10-18 (G3): Portuguese-speaking frontend developers learning ReactJS, starting with how to test by
behaviour with React Testing Library and MSW, without testing implementation details. The owner writes the first
paths. In English the subject is well covered (the Testing Library docs, Kent C. Dodds, roadmap.sh); the bet is
the pt-BR long tail, one specific question per page ("como testar um formulário com user-event", "como simular
erro da API com MSW"), linked as a path. English comes second: the app is already bilingual, the content is not.

## The two spaces

| | Personal notebook | Public catalog |
|---|---|---|
| Who | A logged-in learner | Anyone, logged in or not |
| What | Every path, private by default | Only paths the author **published** |
| Job | Write, link, study, resume | Find a path, understand what it teaches, read it, start studying |
| Owner of content | The author | The author, always |
| Progress | Mine | Mine, once I take the path; a visitor has none |
| Indexed | Never | Yes, once the path passes the quality bar |

## Public and private: three states, not two

Decided 2026-10-18. Today a path is `private` or `public`, and public means "by link, never indexed", a promise made in
`docs/FEATURES.md` and asserted by a test. The catalog must not break it. The states:

| State | Who reads | Listed in the catalog | Search engines |
|---|---|---|---|
| Private | Owner and invited people | No | No (404) |
| Anyone with the link | Anyone with the URL | No | `noindex` (today's "public") |
| Published | Anyone, without an account | Yes | Indexed when it passes the quality bar; `noindex` until then |

Every path public today stays "anyone with the link". Publishing is a separate, explicit act by the author, with a
short summary of what it means ("listed on WisePath and shown to search engines"). The unit stays the whole path;
an author who needs a private page keeps it in another path.

## Experience principles

The ten principles in the brief, plus three that follow from the analysis:

1. **The text is the page.** A published page is readable as plain HTML, with its links as real links; the map
   enhances it and is never the only way in.
2. **Value before signup.** A visitor reads the whole path; signing up is needed only to keep progress or write.
   After signing up they land where they were, already studying.
3. **Few, good, published paths over many thin ones.** The catalog grows by curation, not by volume.

## Scope limits

In: publishing, crawlable public pages, a simple catalog, resume, export, password reset, minimal metrics,
later (gated) donations and curated affiliate links.

Out for this phase: AI, subscriptions, ads before traffic justifies them, real-time collaboration, native apps,
comments and likes, gamification, sponsored paths, custom domains, auto-generated topic pages, copying paths,
the browser extension (plan 8), spaced review.
