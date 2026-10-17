import type { Shape } from '@/i18n/format';
import type { Messages } from '@/i18n/messages/en';
import { auth } from '@/i18n/messages/pt-BR/auth';
import { common } from '@/i18n/messages/pt-BR/common';
import { editor } from '@/i18n/messages/pt-BR/editor';
import { help } from '@/i18n/messages/pt-BR/help';
import { home } from '@/i18n/messages/pt-BR/home';
import { inbox } from '@/i18n/messages/pt-BR/inbox';
import { map } from '@/i18n/messages/pt-BR/map';
import { page } from '@/i18n/messages/pt-BR/page';
import { search } from '@/i18n/messages/pt-BR/search';
import { shell } from '@/i18n/messages/pt-BR/shell';
import { video } from '@/i18n/messages/pt-BR/video';

/** Todas as mensagens em português do Brasil: as mesmas chaves do inglês, nem uma a mais, nem uma a menos */
export const ptBR = { common, auth, shell, home, map, page, editor, video, search, inbox, help } as const satisfies Shape<Messages>;
