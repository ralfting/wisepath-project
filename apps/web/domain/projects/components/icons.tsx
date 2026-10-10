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

export const CloseIcon = () => (
  <Icon width="14" height="14">
    <path d="M4 4l8 8M12 4l-8 8" />
  </Icon>
);

export const BackIcon = () => (
  <Icon>
    <path d="M10 3 5 8l5 5" />
  </Icon>
);

export const TrashIcon = () => (
  <Icon>
    <path d="M2.5 4h11M6 4V2.5h4V4M4 4l.7 9.5h6.6L12 4" />
  </Icon>
);

export const ExpandIcon = () => (
  <Icon>
    <path d="M9.5 2.5h4v4M13.5 2.5 9 7M6.5 13.5h-4v-4M2.5 13.5 7 9" />
  </Icon>
);
