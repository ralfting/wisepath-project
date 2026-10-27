/** Activities on a page (docs/plans/22-page-activities.md): ticking them, the studied control they hold, their badge (which counts questions too) */
export const activity = {
  markDone: 'Mark as done',
  done: 'Done',
  left: { one: '{count} activity left', other: '{count} activities left' },
  leftHint: 'Do the activities on this page to mark it studied. This takes you to the next one.',
  badge: {
    has: 'Has tasks',
    open: { one: '{count} task open', other: '{count} tasks open' },
    done: 'Tasks done',
  },
} as const;
