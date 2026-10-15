import type { Metadata } from 'next';
import { CaptureSettingsPage } from '@/features/capture/CaptureSettingsPage';
import { serverT } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await serverT();
  return { title: t('capture.settings.meta.title') };
}

export default function CaptureSettings() {
  return <CaptureSettingsPage />;
}
