'use client';

import type { AccessNotice } from '@wisepath/domain/paths';
import { useAccessNotices } from '@/useCases/paths';
import { showToast } from '@/features/inbox/capture';
import { useT } from '@/i18n/I18nProvider';

/**
 * Tells the learner, once, about a path they lost without choosing to: made private, no longer shared with them,
 * or deleted. Renders nothing; each notice is a toast
 */
export function AccessNotices() {
  const t = useT();
  useAccessNotices((notice: AccessNotice) => {
    const values = { title: notice.pathTitle, owner: notice.ownerName ?? t('share.notice.owner') };
    showToast({ text: t(`share.notice.${notice.reason}`, values) });
  });
  return null;
}
