'use client';

import { useLinkPreview } from '@/useCases/paths';
import { useT } from '@/i18n/I18nProvider';

/** A video's title as its page gives it, looked up once per address; until then, or without one, just "Video" */
export function VideoTitle({ url }: { url: string }) {
  const t = useT();
  const preview = useLinkPreview(url);
  return <>{(preview.status === 'ready' && preview.preview.title) || t('editor.outline.kinds.video')}</>;
}
