/** Messages for the map area, in English: the source the other languages follow */
export const map = {
  pages: { one: '{count} page', other: '{count} pages' },
  status: {
    done: 'Studied',
    current: 'Up next',
    todo: 'Not started',
  },
  view: {
    label: 'View',
    map: 'Map',
    list: 'List',
  },
  header: {
    more: 'More for {title}',
  },
  search: {
    label: 'Search this path',
    /** The closed search's button, which shows the shortcut: its name says it too */
    labelWithKeys: 'Search this path {keys}',
    placeholder: 'Search pages…',
    withQuery: 'Search this path: {query}',
    clear: 'Clear the search',
  },
  results: {
    count: { zero: 'No page matches', one: '{count} page', other: '{count} pages' },
    label: 'Pages found',
    centre: 'Centre of the path',
    offMap: 'Not on the map',
    inPage: 'In {title}',
  },
  continue: {
    summary: { one: '{studied} of {count} page studied', other: '{studied} of {count} pages studied' },
    count: { one: '{studied}/{count} page', other: '{studied}/{count} pages' },
    allStudied: { one: '{count} page studied', other: 'All {count} pages studied' },
    start: 'Start',
    continue: 'Continue',
    startStudying: 'Start studying',
    continueStudying: 'Continue studying',
    startStudyingPage: 'Start studying: {title}',
    continueStudyingPage: 'Continue studying: {title}',
    opens: 'Opens {title}',
  },
  ghost: {
    /** A page named with [[Title]] but not made yet, on the map and in the list */
    label: '{title}, not made yet. Make it',
  },
  mind: {
    label: 'Map of {title}. Arrow keys move between pages, Enter opens one.',
    module: 'module',
    belowStudied: { one: '{studied} of {count} below studied', other: '{studied} of {count} below studied' },
    pagesBelow: { one: '{count} page below', other: '{count} pages below' },
    rootStudied: { one: '{studied} of {count} studied', other: '{studied} of {count} studied' },
  },
  tools: {
    label: 'Map view',
    zoomOut: 'Zoom out',
    zoomIn: 'Zoom in',
    fit: 'Fit the map to the screen',
    /** The zoom button shows the zoom; its name starts with it */
    fitAt: '{zoom}%, fit the map to the screen',
    centreOn: 'Centre on {title}',
    legend: 'Legend',
  },
  branch: {
    add: 'Add a page to {title}',
    dialog: 'New page in {title}',
    field: 'Name of the new page',
    hint: 'Enter adds and opens · {mod}Enter adds and stays · Esc closes',
    exists: '“{title}” exists: Enter links it here',
    isThis: 'That is this page',
    added: 'Added “{title}” to “{parent}”',
    linked: 'Linked “{title}” from “{parent}”',
    undo: 'Undo',
    listAdd: 'New page',
  },
  legend: {
    crossLink: 'Link between pages on different branches',
    keys: 'Tab into the map, then the arrow keys move between pages, Enter opens one and N adds a page branching from it.',
  },
  list: {
    empty: 'Nothing on the map yet. Add a page below, or type / in the content of {title}.',
    orphans: 'Orphans',
    orphansHeading: 'Orphans · no link reaches them',
  },
  orphans: {
    count: { one: "{count} page isn't on the map", other: "{count} pages aren't on the map" },
    hint: {
      one: 'No link reaches it from {title}. Link it with [[Title]] in any page of the path.',
      other: 'No link reaches them from {title}. Link them with [[Title]] in any page of the path.',
    },
  },
} as const;
