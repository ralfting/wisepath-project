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
  primaryShade: 6,
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
  },
  light: {
    // The ground behind cards: a touch cooler than white
    '--wp-ground': '#F6F8FB',
    '--wp-line': t.colors.gray[3],
    '--mantine-color-body': t.white,
    '--mantine-color-text': t.colors.dark[7],
    '--mantine-color-dimmed': t.colors.gray[6],
  },
  dark: {},
});
