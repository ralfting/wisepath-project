---
paths:
  - "apps/web/features/**"
  - "apps/web/app/**/*.tsx"
  - "apps/web/app/**/*.css"
  - "apps/web/theme.ts"
  - "apps/web/i18n/**"
---

# UI patterns

## Design system

- Mantine 8 is the component library; `apps/web/theme.ts` holds the theme and the app's CSS variables (`--wp-*`).
- Mantine component first: `Button`, `TextInput`, `Modal`, `Drawer`, `Menu`, `Stack`, `Group`, `Text`, `Title`, `Alert`.
  Raw `<div>`/`<button>` only when no Mantine component fits, with the reason in a comment.
- Prefer compound APIs when Mantine has one (`Drawer.Root` / `Drawer.Content`). **Why:** the page drawer once queried
  `.mantine-Drawer-content` in a `requestAnimationFrame` to set its `aria-label`; `Drawer.Content` takes it as a prop.
- Component defaults (radius, border, shadow) belong in `theme.ts` `components`, not repeated at call sites.

## Tokens

| Need | Use | Never |
|---|---|---|
| Color | `c="dimmed"`, `color="blue"`, `var(--mantine-color-blue-6)`, `light-dark(...)`, `var(--wp-ground)`, `var(--wp-line)` | `#5F6670`, `rgb(...)` |
| Spacing | `p="md"`, `gap="sm"`, `var(--mantine-spacing-md)` | `padding: 12px` |
| Font size | `size="sm"`, `var(--mantine-font-size-sm)` | `font-size: 13px` |
| Radius, shadow | `radius="md"`, `var(--mantine-radius-md)`, `var(--mantine-shadow-md)` | `border-radius: 6px`, raw `box-shadow` |
| Breakpoint | `@media (min-width: $mantine-breakpoint-sm)`, `hiddenFrom="sm"` | `@media (min-width: 768px)` |
| A value the theme lacks | Add a `--wp-*` variable in `cssVariablesResolver` with a why comment, light and dark | A one-off literal |

- Hairlines (`1px` borders), `0`, percentages and `em` offsets are fine. `rem(...)` only for sizes, never to dodge
  the spacing scale.
- Existing CSS Modules hold ~280 raw hex/px values. Do not add more; replace them in lines you already change.
- Contrast: text passes WCAG AA (4.5:1) in light and dark. **Why:** `--mantine-color-dimmed` and the light tints were
  darkened for this (see the comments in `theme.ts`); a new color must be checked the same way.

## Styling

- Styles live in `<Component>.module.css` beside the component, or in Mantine style props for one-off layout.
  No inline `style={{}}` except for values computed at runtime (positions, measured sizes).
- `app/globals.css` is only for what Mantine and modules cannot reach (body ground, selection, a global class used
  outside React). Never add component styles there.
- Mantine loads in `@layer mantine` (`app/layout.tsx`), so module CSS wins at equal specificity. Never raise
  specificity or use `!important` to beat Mantine. **Why:** loading order once flipped and Mantine won (fix "the
  app's styles outrank Mantine's again").
- Use nesting, `&[data-*]` for state, and `@media (prefers-reduced-motion: reduce)` on every transition or animation.
- Fixed and portal elements (notifications, rails) set `pointer-events` deliberately. **Why:** invisible toast
  containers once covered the page and swallowed every click.

## i18n in components

- Client: `const t = useT()`; server: `const t = await serverT()`. Keys are typed (`TranslationKey`); never build a
  key from a string at runtime.
- Interpolate with values (`t('common.language.current', { name })`), never by concatenating strings.
- Dates through `i18n/dates.ts` (`relativeTime`, `dateTime`), counts through plural messages (`Plural` in
  `i18n/format.ts`); never `toLocaleString()` or `count + ' pages'` directly.
- New area: add `messages/en/<area>.ts` and `messages/pt-BR/<area>.ts`, register both in their `index.ts`.
- Vocabulary in both languages follows the glossary in `docs/plans/05-i18n.md`.

## Components

- One exported component per file; small private subcomponents in the same file until it nears ~300 lines.
- Props are a named `interface <Component>Props` when there are more than two, `readonly` where the component does
  not own the value.
- Callbacks are `on<Event>`; the handler that implements one is `handle<Event>` ([architecture.md](architecture.md)).
- Lists and palettes share keyboard handling (`usePaletteKeys`, `paletteFieldProps`); never re-implement the
  arrow/Enter loop or combobox ARIA.
- Loading, empty and error states are designed, not left blank: skeleton or `Loader`, an empty state with the next
  action, an `Alert` with retry.

## Accessibility

- Every interactive element is reachable and operable by keyboard; shortcuts are listed in `docs/FEATURES.md`.
- Icon-only buttons have a translated `aria-label`. Dialogs, drawers and menus have an accessible name.
- Use roles and labels that tests can query (`getByRole('button', { name })`); never add `data-testid` for styling.
- Visible focus on everything focusable (`focusRing: 'auto'` in the theme); never `outline: none` without a replacement.
- Check new screens with axe in light and dark (see `docs/plans/AGENTS.md`, "Done means").

## Pre-flight checklist

- [ ] Mantine components and compound APIs used before raw HTML.
- [ ] No raw hex, px spacing, px font size, radius or shadow added; new values became `--wp-*` tokens.
- [ ] Styles in a colocated CSS Module; no `!important`, no `globals.css` additions.
- [ ] Every visible string and aria-label goes through `useT`/`serverT`, in `en` and `pt-BR`.
- [ ] Loading, empty and error states exist.
- [ ] Keyboard path works; icon buttons named; focus visible; axe clean in light and dark.
- [ ] Transitions respect `prefers-reduced-motion`.
