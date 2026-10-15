/** Messages for search everywhere (the ⌘P palette), in English: the source the other languages follow */
export const search = {
  open: 'Search pages',
  palette: {
    label: 'Search every path',
    placeholder: 'Search pages in every path',
    results: 'Pages found',
  },
  recent: {
    title: 'Recently opened',
    empty: 'Pages you open show up here. Type to search every path.',
  },
  found: {
    title: { one: '{count} page', other: '{count} pages' },
    none: 'No page has “{query}” in its title or text.',
    searching: 'Searching…',
  },
  hints: {
    move: 'move',
    open: 'open on its map',
    full: 'open as a full page',
    close: 'close',
  },
} as const;
