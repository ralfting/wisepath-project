import { auth } from '@/i18n/messages/en/auth';
import { common } from '@/i18n/messages/en/common';
import { editor } from '@/i18n/messages/en/editor';
import { help } from '@/i18n/messages/en/help';
import { home } from '@/i18n/messages/en/home';
import { inbox } from '@/i18n/messages/en/inbox';
import { map } from '@/i18n/messages/en/map';
import { page } from '@/i18n/messages/en/page';
import { search } from '@/i18n/messages/en/search';
import { share } from '@/i18n/messages/en/share';
import { shell } from '@/i18n/messages/en/shell';
import { video } from '@/i18n/messages/en/video';

/** Every message in English, by area. The keys here are the ones every language has */
export const en = { common, auth, shell, home, map, page, editor, video, search, inbox, help, share } as const;
export type Messages = typeof en;
