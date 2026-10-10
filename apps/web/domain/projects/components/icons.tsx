import type { SVGProps } from 'react';

/** Small stroke icon set for the project view: 16px grid, 1.5 stroke */
function Icon({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const FocusIcon = () => (
  <Icon>
    <circle cx="8" cy="8" r="2" />
    <circle cx="8" cy="8" r="5.5" />
    <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15" />
  </Icon>
);

export const FitIcon = () => (
  <Icon>
    <path d="M2 5.5V2h3.5M10.5 2H14v3.5M14 10.5V14h-3.5M5.5 14H2v-3.5" />
  </Icon>
);

export const PlusIcon = () => (
  <Icon>
    <path d="M8 3v10M3 8h10" />
  </Icon>
);

export const MinusIcon = () => (
  <Icon>
    <path d="M3 8h10" />
  </Icon>
);

export const GridIcon = () => (
  <Icon>
    <path d="M5.5 1.5v13M10.5 1.5v13M1.5 5.5h13M1.5 10.5h13" />
  </Icon>
);

export const SearchIcon = () => (
  <Icon>
    <circle cx="7" cy="7" r="4.5" />
    <path d="M10.5 10.5 14 14" />
  </Icon>
);

export const VideoIcon = () => (
  <Icon>
    <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" />
    <path d="m6.5 6 3.5 2-3.5 2z" />
  </Icon>
);

export const ArticleIcon = () => (
  <Icon>
    <path d="M3.5 1.5h6l3 3v10h-9z" />
    <path d="M6 8h4.5M6 10.5h4.5" />
  </Icon>
);

export const BookIcon = () => (
  <Icon>
    <path d="M2 3c2-1 4-1 6 .5C10 2 12 2 14 3v10c-2-1-4-1-6 .5C6 12 4 12 2 13z" />
    <path d="M8 3.5v10" />
  </Icon>
);

export const NoteIcon = () => (
  <Icon>
    <path d="M10.5 2.5 13.5 5.5 6 13H3v-3z" />
  </Icon>
);

export const ExternalIcon = () => (
  <Icon width="12" height="12">
    <path d="M9 2.5h4.5V7M13.5 2.5 7.5 8.5M11.5 9.5v4h-9v-9h4" />
  </Icon>
);
