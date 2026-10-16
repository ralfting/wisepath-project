/** Messages for the home area (the list of paths, a path's kind, saving), in English: the source the other languages follow */
export const home = {
  meta: {
    paths: 'My paths | WisePath',
    path: 'Path | WisePath',
  },
  title: 'My paths',
  intro: 'Each path is a subject you are learning, page by page, connected by the links you write.',
  search: 'Search paths',
  newPath: 'New path',
  empty: 'No paths yet. Start one with New path.',
  noMatch: 'No paths match “{query}”.',
  card: {
    pages: { one: '{count} page', other: '{count} pages' },
    modules: { one: '{count} module', other: '{count} modules' },
    orphans: { one: '{count} orphan', other: '{count} orphans' },
    more: 'More for {title}',
    progress: 'Progress in {title}',
    studied: { one: '{studied} of {count} page studied', other: '{studied} of {count} pages studied' },
    next: 'Next: {title}',
    open: 'Open path',
    start: 'Start studying',
    continue: 'Continue studying',
    delete: 'Delete path',
  },
  create: {
    title: 'New path',
    name: 'What are you learning?',
    nameHint: "The path's main page takes this name. Add pages to it by typing / and choosing Page.",
    namePlaceholder: 'Rust, Linear algebra, Japanese…',
    nameRequired: 'Give the path a name',
    kind: 'What kind of path?',
    kindHint: "You can switch it later from the path's menu.",
    submit: 'Create path',
  },
  delete: {
    title: 'Delete path?',
    body: {
      one: "and its page will be deleted, with what you marked as studied. This can't be undone.",
      other: "and its {count} pages will be deleted, with what you marked as studied. This can't be undone.",
    },
    keep: 'Keep it',
    confirm: 'Delete path',
  },
  kind: {
    study: {
      label: 'Study',
      hint: 'Create and organise pages freely. No progress to track.',
      switchTo: 'Turn into study',
    },
    learningPath: {
      label: 'Learning path',
      hint: 'Follow it page by page, marking what you studied.',
      switchTo: 'Turn into learning path',
    },
  },
  save: {
    saving: 'Saving…',
    saved: 'Saved',
    offline: 'Offline · retrying',
    offlineHint: 'Your changes are kept here and will be saved as soon as WisePath can be reached.',
    undone: 'Change undone',
    /** Why the API refused a change (useCases/paths/sync.ts) */
    notice: {
      titleTaken: 'Another page already has that title, so the change was undone.',
      pageDeleted: 'That page was deleted elsewhere, so the change was undone.',
      rootProtected: "The map's main page can't be changed that way.",
      notSaved: "A change couldn't be saved and was undone.",
    },
  },
  gate: {
    title: "Can't open this path",
    body: "WisePath can't be reached right now. Reload the page to try again.",
  },
  notFound: {
    title: 'Path not found',
    body: "This path doesn't exist or the link is wrong. Your paths are listed in My paths.",
    back: 'Go to My paths',
  },
  errors: {
    pathGone: 'This path no longer exists.',
  },
} as const;
