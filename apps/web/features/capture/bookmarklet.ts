/**
 * Bookmarklet
 * "Send to WisePath": a bookmark whose address is a script. Clicked on any
 * site, it reads the page's title and address, the selected text and, on
 * YouTube, the video's moment, and opens WisePath's /capture page with them
 * in a small window. It can't call the API itself (the session cookie and
 * CORS belong to the app), so the capture page, which is WisePath, saves it.
 *
 * Its code is a plain string rather than a compiled function: the bundler
 * renames and rewrites functions, and a bookmark has to run as written on any
 * page. The tests run this same string against a fake page.
 */

/** How much of the selection and the title travel in the address, so it stays well under what servers accept */
export const LIMITS = { text: 3000, title: 300, url: 2048 } as const;

/** The popup's name and size: a second click reuses the same window */
const WINDOW = { name: 'wisepath-capture', features: 'width=420,height=360' } as const;

/** The script itself, for the app at that origin; it uses only window, document and location */
export function bookmarkletScript(origin: string): string {
  return [
    '(function(){',
    'var d=document,w=window,l=location,q=new URLSearchParams(),',
    's=String(w.getSelection?w.getSelection():"").trim(),',
    'v=/(^|\\.)youtube\\.com$/.test(l.hostname)?d.querySelector("video"):null;',
    // An address too long to keep whole is left out: a cut one would lead nowhere
    `if(l.href.length<=${LIMITS.url})q.set("url",l.href);`,
    `if(d.title)q.set("title",d.title.slice(0,${LIMITS.title}));`,
    `if(s)q.set("text",s.length>${LIMITS.text}?s.slice(0,${LIMITS.text - 1})+"\\u2026":s);`,
    'if(v&&v.currentTime>0)q.set("t",String(Math.floor(v.currentTime)));',
    `var u=${JSON.stringify(`${origin}/capture?`)}+q;`,
    // Where popups are blocked, the capture page opens in the tab instead
    `if(!w.open(u,${JSON.stringify(WINDOW.name)},${JSON.stringify(WINDOW.features)}))l.href=u;`,
    '})()',
  ].join('');
}

/** The bookmark's address */
export const bookmarkletHref = (origin: string) => `javascript:${bookmarkletScript(origin)}`;
