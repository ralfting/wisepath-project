import { auth } from './auth';
import { common } from './common';
import { editor } from './editor';
import { help } from './help';
import { home } from './home';
import { inbox } from './inbox';
import { map } from './map';
import { page } from './page';
import { search } from './search';
import { shell } from './shell';
import { video } from './video';

/** Every message in English, by area. The keys here are the ones every language has */
export const en = { common, auth, shell, home, map, page, editor, video, search, inbox, help } as const;
export type Messages = typeof en;
