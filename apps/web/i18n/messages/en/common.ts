/** Messages shared across the app, in English: the source the other languages follow */
export const common = {
  /** A page that has no title yet */
  untitledPage: 'Untitled page',
  language: {
    menu: 'Language',
    current: '{name}, in use',
  },
  /** The colour scheme, picked in the account menu; System follows the device's setting */
  appearance: {
    menu: 'Appearance',
    current: '{name}, in use',
    light: 'Light',
    dark: 'Dark',
    system: 'System',
  },
  actions: {
    cancel: 'Cancel',
    close: 'Close',
    delete: 'Delete',
    save: 'Save',
    retry: 'Retry',
  },
  /** An address that leads to no screen at all: mistyped, or an old link */
  notFound: {
    title: 'Page not found',
    body: "This address doesn't exist or the link is wrong.",
    home: 'Go to WisePath',
  },
  errors: {
    unavailable: "Can't reach WisePath right now. Try again in a moment.",
    generic: 'Something went wrong. Try again in a moment.',
    /** A Server Action found no session: it expired, or the learner logged out in another tab */
    signedOut: 'Your session has ended. Log in again to continue.',
  },
} as const;
