import { createTheme } from '@mantine/core';
import type { CSSVariablesResolver } from '@mantine/core';

/**
 * WisePath theme on Mantine's own tokens: blue for actions and the current
 * topic, teal to cyan for progress, and Mantine's named colours for modules
 * (a module's `color` is one of those names). Inter sets everything; cards are
 * white on a near-white ground with soft shadows and generous radii.
 */

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
    // The dialogs' X is named for screen readers, which otherwise hear only "button"
    Modal: { defaultProps: { closeButtonProps: { 'aria-label': 'Close' } } },
  },
});

export const cssVariablesResolver: CSSVariablesResolver = (t) => ({
  variables: {
    // The app frame's top bar; the page drawer opens below it
    '--wp-topbar-height': '64px',
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
  },
  dark: {
    // Mantine's dark 2 (#828282) falls short on the drawer's ground (#2E2E2E); this passes AA on it and on the body
    '--mantine-color-dimmed': '#9A9A9A',
  },
});
