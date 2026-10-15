import { auth } from './auth';
import { common } from './common';
import { editor } from './editor';
import { home } from './home';
import { map } from './map';
import { page } from './page';
import { review } from './review';
import { shell } from './shell';
import { templates } from './templates';
import { video } from './video';

/** Every message in English, by area. The keys here are the ones every language has */
export const en = { common, auth, shell, home, map, page, editor, video, templates, review } as const;
export type Messages = typeof en;
