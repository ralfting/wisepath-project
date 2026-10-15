/** Messages for capturing from the web (the bookmarklet's window and its settings), in English: the source the other languages follow */
export const capture = {
  window: {
    meta: {
      title: 'Send to WisePath',
    },
    heading: 'Send to the Inbox',
    page: 'The page',
    noTitle: 'Untitled page',
    at: 'at {time}',
    quote: 'Selected on the page',
    note: 'Your note',
    notePlaceholder: 'Why it matters, what to do with it… (optional)',
    hint: 'Enter sends · Shift+Enter new line · Esc closes',
    send: 'Send',
    loading: 'Opening WisePath…',
    waiting: "Can't reach WisePath. It will be sent as soon as it can.",
    saved: {
      title: 'Saved to the Inbox',
      body: 'You can close this window.',
    },
    empty: {
      title: 'Nothing to capture',
      body: 'Open this window with the Send to WisePath bookmark, from the page you want to keep.',
      settings: 'Set up the bookmark',
    },
  },
  settings: {
    meta: {
      title: 'Capture from the web | WisePath',
    },
    crumb: 'Settings',
    menu: 'Capture from the web',
    title: 'Capture from the web',
    intro: 'Keep what you read and watch on other sites: a bookmark sends the page you are on to your Inbox, with the text you selected.',
    steps: {
      label: 'Setting it up',
      bar: 'Show the bookmarks bar ({keys}).',
      drag: 'Drag this button to the bookmarks bar:',
      use: 'On any page, select what matters (or nothing) and click the bookmark. A small window opens with the page filled in: add a note if you like and press Enter.',
    },
    bookmarklet: 'Send to WisePath',
    dragHint: 'Drag it to the bookmarks bar. It works from other sites, not here.',
    video: 'On YouTube it keeps the moment the video is at. Filed into a page that has the video, it becomes a note under it, like {example}.',
    copy: {
      intro: "Can't drag it? Copy its address, add a bookmark by hand and paste it as the bookmark's address.",
      button: 'Copy the address',
      done: 'Copied',
    },
    login: 'Logged out, the window asks you to log in first, then shows the page filled in.',
  },
} as const;
