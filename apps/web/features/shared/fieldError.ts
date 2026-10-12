/** First validation message for a form field, from TanStack Form's error list */
export function fieldError(errors: ReadonlyArray<unknown>): string | undefined {
  for (const error of errors) {
    if (typeof error === 'string') return error;
    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message;
  }
  return undefined;
}
