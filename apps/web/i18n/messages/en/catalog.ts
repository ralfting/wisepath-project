/** Messages for a published path read in the catalog, in English */
export const catalog = {
  explore: {
    meta: 'Catalog of paths | WisePath',
    description: 'Paths written by people who studied the subject: their notes, linked as a map, to study with your own progress.',
    title: 'Catalog of paths',
    intro: 'Paths written by people who studied the subject: their notes, linked as a map. Read them without an account, or study one with your own progress.',
    languages: 'Language',
    all: 'All',
    none: 'No paths here yet.',
    pages: { one: '{count} page', other: '{count} pages' },
    link: 'Catalog',
  },
  meta: '{page} | {path} | WisePath',
  metaRoot: '{path} | WisePath',
  for: 'For: {audience}',
  trail: 'Where this page sits',
  related: 'Related pages',
  pages: 'Pages in this path',
  pager: 'Previous and next page',
  previous: 'Previous',
  next: 'Next',
  empty: 'This page has no text yet.',
} as const;
