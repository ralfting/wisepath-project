/** Messages for the auth area, in English: the source the other languages follow */
export const auth = {
  landing: {
    explore: 'Explore paths',
    tagline: 'Map what you are learning, page by page, down to “Now I know it”.',
    what: 'A page of notes for each thing you learn.',
    links: 'Linked with [[ ]], so the subject takes shape as a map.',
    study: 'Followed page by page, marking what you studied.',
    logIn: 'Log in',
    signUp: 'Sign up',
  },
  fields: {
    email: 'Email',
    emailPlaceholder: 'you@example.com',
    password: 'Password',
    name: 'Name',
    namePlaceholder: 'How should we call you?',
  },
  login: {
    title: 'Log in',
    intro: 'Enter your email and password to continue to your paths.',
    passwordPlaceholder: 'Your password',
    submit: 'Log in',
    noAccount: "Don't have an account?",
    signUp: 'Sign up',
  },
  signup: {
    title: 'Create an account',
    intro: 'Your paths and notes are kept under this account.',
    passwordHint: 'At least 8 characters',
    passwordPlaceholder: 'Choose a password',
    submit: 'Create account',
    haveAccount: 'Already have an account?',
    logIn: 'Log in',
  },
  deleteAccount: {
    title: 'Delete your account?',
    body: "Every path you own goes, with its pages, along with your projects, your Inbox and your progress on paths from others. People studying your paths lose them. This can't be undone.",
    downloadFirst: 'Download my paths first',
    confirmHint: 'Type your password to confirm.',
    keep: 'Keep my account',
    confirm: 'Delete account',
    wrongPassword: "That password isn't right.",
  },
  errors: {
    invalidCredentials: 'Email or password is incorrect.',
    emailTaken: 'An account with this email already exists. Log in instead.',
  },
  /** The domain's validation messages (see useCases/validation.ts) */
  validation: {
    email: 'Enter a valid email address',
    password: 'Enter your password',
    name: 'Tell us your name',
    passwordLength: 'Use at least 8 characters',
  },
} as const;
