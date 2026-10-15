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
  },
} as const;
