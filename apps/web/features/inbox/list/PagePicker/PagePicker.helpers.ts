import type { PageTarget } from '@/useCases/inbox';

export interface PickedPage extends PageTarget {
  readonly pageTitle: string;
}

export const matches = (title: string, query: string) => title.toLowerCase().includes(query.trim().toLowerCase());

// → and ← move between the steps only where they can't move the cursor in the search any further
export const caretAt = (field: HTMLInputElement, end: 'start' | 'end') =>
  field.selectionStart === field.selectionEnd && field.selectionStart === (end === 'start' ? 0 : field.value.length);
