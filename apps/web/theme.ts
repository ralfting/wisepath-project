import { createTheme } from '@mantine/core';
import type { CSSVariablesResolver, MantineColorScheme } from '@mantine/core';

/**
 * WisePath theme on Mantine's own tokens: blue for actions and the current
 * topic, teal to cyan for progress, and Mantine's named colours for modules
 * (a module's `color` is one of those names). Inter sets everything but the
 * reader's answers, which have a serif of their own (`--wp-font-answer`);
 * cards are white on a near-white ground with soft shadows and generous radii.
 */

/** The browser's colour scheme until the learner picks one in the account menu (Appearance), which Mantine keeps in local storage */
export const defaultColorScheme: MantineColorScheme = 'auto';

export const theme = createTheme({
  primaryColor: 'blue',
  // Shade 8: white labels on filled buttons pass WCAG AA contrast (shade 6 gave 3.5:1)
  primaryShade: 8,
  fontFamily: 'var(--font-sans), system-ui, sans-serif',
  fontFamilyMonospace: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  headings: {
    fontFamily: 'var(--font-sans), system-ui, sans-serif',
    fontWeight: '700',
  },
  defaultRadius: 'md',
  defaultGradient: { from: 'teal.5', to: 'cyan.5', deg: 90 },
  cursorType: 'pointer',
  focusRing: 'auto',
  shadows: {
    xs: '0 1px 2px rgba(16, 24, 40, 0.05)',
    sm: '0 1px 3px rgba(16, 24, 40, 0.08), 0 1px 2px rgba(16, 24, 40, 0.04)',
    md: '0 6px 16px -4px rgba(16, 24, 40, 0.10), 0 2px 6px -2px rgba(16, 24, 40, 0.05)',
    lg: '0 14px 30px -8px rgba(16, 24, 40, 0.14)',
    xl: '0 24px 48px -12px rgba(16, 24, 40, 0.18)',
  },
  components: {
    Card: { defaultProps: { radius: 'lg', withBorder: true, shadow: 'xs' } },
    Button: { defaultProps: { radius: 'md' } },
    TextInput: { defaultProps: { radius: 'md' } },
    Progress: { defaultProps: { radius: 'xl' } },
  },
});

export const cssVariablesResolver: CSSVariablesResolver = (t) => ({
  variables: {
    // The app frame's top bar; the page drawer opens below it
    '--wp-topbar-height': '64px',
    // A page's text column: about 90 characters of body text, and as wide as a video note
    '--wp-page-width': '40rem',
    // The same column made wider, for a large screen, when the reader asks for it
    '--wp-page-width-wide': '56rem',
    // The reader's own writing (a question's answer): a text serif, so it reads as theirs beside the page's Inter
    '--wp-font-answer': 'var(--font-answer), ui-serif, Georgia, serif',
  },
  light: {
    // The ground behind cards: a touch cooler than white
    '--wp-ground': '#F6F8FB',
    '--wp-line': t.colors.gray[3],
    '--mantine-color-body': t.white,
    '--mantine-color-text': t.colors.dark[7],
    // Between Mantine's gray 6 and 7: secondary text passes AA (4.5:1) on white and on the light tints behind it
    '--mantine-color-dimmed': '#5F6670',
    // Blue text on its light tint (the active link, light buttons): shade 9 for AA contrast
    '--mantine-color-blue-light-color': t.colors.blue[9],
    // And teal (the Studied toggle): Mantine's teal 9 falls just short, so a step darker
    '--mantine-color-teal-light-color': '#06704F',
    // And yellow (the warning callout's icon): no yellow shade reaches 3:1 on its tint, the darkest orange does
    '--mantine-color-yellow-light-color': t.colors.orange[9],
    // Orange text (c="orange": unlinked pages, waiting to save): Mantine's darkest orange reaches 4.3:1 on white, this
    // passes AA on white and on orange 0. In dark Mantine's own (orange 4) already passes
    '--mantine-color-orange-text': '#C2410C',
    // Red text (c="red", Delete account): Mantine's red 8 makes 4.5:1 on white, less on its own hover tint
    '--mantine-color-red-text': t.colors.red[9],
  },
  dark: {
    // Without it the body has no background in dark, and contrast checkers measure the text against white
    '--wp-ground': t.colors.dark[8],
    // Without it every hairline (the sidebar's edge, the drawer's frame, the catalog's rules) vanishes in dark
    '--wp-line': t.colors.dark[4],
    // Mantine's dark 2 (#828282) falls short on the drawer's ground (#2E2E2E); this passes AA on it, on the body and
    // on a hovered or open row (dark 5, #3B3B3B), where #9A9A9A made 4:1
    '--mantine-color-dimmed': '#A6A6A6',
  },
});
