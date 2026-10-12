import { createTheme } from '@mantine/core';
import type { CSSVariablesResolver, MantineColorsTuple } from '@mantine/core';

/**
 * WisePath theme: the Star Atlas identity on top of Mantine.
 * Atlas blue is the primary colour (the chart field is shade 7), finder red
 * marks primary actions and the selected star, Atkinson Hyperlegible sets the
 * interface and Spectral italic sets titles, like star names on a chart.
 * Colours come only from these scales so a dark scheme can be added later.
 */

const atlas: MantineColorsTuple = [
  '#F4F7FB', // 0 star ink, cards
  '#E9EEF5', // 1 app background
  '#C9D6EA', // 2 star rings, linked labels
  '#8FA6C9', // 3 faint stars and lines
  '#6E8AB5', // 4
  '#3B5A8C', // 5
  '#2F5084', // 6 chart grid
  '#1B3A6B', // 7 chart field, primary
  '#16233A', // 8 text
  '#0E1727', // 9
];

const finder: MantineColorsTuple = [
  '#FDF0EE',
  '#FADAD6',
  '#F5B3AB',
  '#F18B80',
  '#EE6A5C', // 4 rings on the chart
  '#E25443',
  '#CE392C', // 6 primary actions
  '#B02F24',
  '#8E261D',
  '#6C1D16',
];

export const theme = createTheme({
  primaryColor: 'atlas',
  primaryShade: 7,
  colors: { atlas, finder },
  fontFamily: 'var(--font-sans), system-ui, sans-serif',
  fontFamilyMonospace: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  headings: {
    fontFamily: 'var(--font-star), Georgia, serif',
    fontWeight: '500',
  },
  defaultRadius: 'sm',
  radius: { xs: '2px', sm: '4px', md: '6px', lg: '8px', xl: '12px' },
  cursorType: 'pointer',
  focusRing: 'auto',
  components: {
    // Page and section titles read like star names: Spectral italic
    Title: { defaultProps: { fs: 'italic' } },
  },
});

export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {},
  light: {
    '--mantine-color-body': atlas[0],
    '--mantine-color-text': atlas[8],
    '--mantine-color-dimmed': '#4A5B78',
    '--mantine-color-default-border': '#CBD5E3',
    '--mantine-color-placeholder': '#6B7A92',
  },
  dark: {},
});
