import { Context } from 'effect';
import type { UserId } from '@wisepath/domain/auth';

/** Who sent the request; every path command acts on their maps only */
export class CurrentUser extends Context.Service<CurrentUser, { readonly id: UserId }>()(
  '@wisepath/api/paths/application/CurrentUser',
) {}
