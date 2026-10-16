import type { Shape } from '../../format';
import type { Messages } from '../en';
import { auth } from './auth';
import { common } from './common';
import { editor } from './editor';
import { home } from './home';
import { inbox } from './inbox';
import { map } from './map';
import { page } from './page';
import { review } from './review';
import { search } from './search';
import { shell } from './shell';
import { templates } from './templates';
import { video } from './video';

/** Todas as mensagens em português do Brasil: as mesmas chaves do inglês, nem uma a mais, nem uma a menos */
export const ptBR = { common, auth, shell, home, map, page, editor, video, templates, review, search, inbox } as const satisfies Shape<Messages>;
