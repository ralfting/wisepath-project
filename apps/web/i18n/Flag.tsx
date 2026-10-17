import type { Locale } from '@/i18n/locales';

/**
 * Flag
 * A small flag for each language, drawn rather than an emoji: emoji flags show
 * as letters ("US", "BR") on Windows. Decorative: the language's name is
 * always written beside it.
 */
export function Flag({ locale, size = 18 }: { locale: Locale; size?: number }) {
  const height = Math.round((size * 2) / 3);
  return (
    <svg width={size} height={height} viewBox="0 0 30 20" aria-hidden="true" style={{ borderRadius: 2, flexShrink: 0, display: 'block' }}>
      {locale === 'pt-BR' ? (
        <>
          <rect width="30" height="20" fill="#009C3B" />
          <path d="M15 2.5 27 10 15 17.5 3 10z" fill="#FFDF00" />
          <circle cx="15" cy="10" r="4.6" fill="#002776" />
          <path d="M10.6 9.2c3-.9 6.2-.6 8.9.8" stroke="#fff" strokeWidth="0.9" fill="none" />
        </>
      ) : (
        <>
          <rect width="30" height="20" fill="#B22234" />
          {[1, 3, 5, 7, 9, 11].map((i) => (
            <rect key={i} y={(i * 20) / 13} width="30" height={20 / 13} fill="#fff" />
          ))}
          <rect width="13" height={(7 * 20) / 13} fill="#3C3B6E" />
        </>
      )}
      <rect width="30" height="20" fill="none" stroke="rgba(0,0,0,0.12)" />
    </svg>
  );
}
