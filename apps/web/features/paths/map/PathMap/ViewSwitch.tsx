'use client';

import { Center, SegmentedControl } from '@mantine/core';
import { IconLayoutList, IconSitemap } from '@tabler/icons-react';
import { useT } from '@/i18n/I18nProvider';
import classes from './PathMap.module.css';
import type { View } from './PathMap.helpers';

/** What the canvas shows: the map or the list */
export function ViewSwitch({ view, onChange }: { view: View; onChange: (view: View) => void }) {
  const t = useT();
  return (
    <SegmentedControl
      size="sm"
      value={view}
      onChange={(value) => onChange(value as View)}
      aria-label={t('map.view.label')}
      className={classes.viewSwitch}
      data={[
        {
          value: 'map',
          label: (
            <Center style={{ gap: 6 }}>
              <IconSitemap size={14} />
              <span>{t('map.view.map')}</span>
            </Center>
          ),
        },
        {
          value: 'list',
          label: (
            <Center style={{ gap: 6 }}>
              <IconLayoutList size={14} />
              <span>{t('map.view.list')}</span>
            </Center>
          ),
        },
      ]}
    />
  );
}
