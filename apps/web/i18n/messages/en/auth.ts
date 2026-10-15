/** Messages for the auth area, in English: the source the other languages follow */
export const auth = {
  landing: {
    tagline: 'Map what you are learning, page by page, down to “Now I know it”.',
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
