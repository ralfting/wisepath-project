/** Messages shared across the app, in English: the source the other languages follow */
export const common = {
  /** A page that has no title yet */
  untitledPage: 'Untitled page',
  language: {
    menu: 'Language',
    current: '{name}, in use',
  },
  actions: {
    cancel: 'Cancel',
    close: 'Close',
    delete: 'Delete',
    save: 'Save',
    retry: 'Retry',
  },
  errors: {
    unavailable: "Can't reach WisePath right now. Try again in a moment.",
    generic: 'Something went wrong. Try again in a moment.',
    /** A Server Action found no session: it expired, or the learner logged out in another tab */
    signedOut: 'Your session has ended. Log in again to continue.',
  },
} as const;
