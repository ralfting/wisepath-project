'use client';

import { Select } from '@mantine/core';
import type { MemberRole } from '@wisepath/domain/paths';
import { useT } from '@/i18n/I18nProvider';

/** Can read or Can edit, for a person or an invite in the list */
export function RoleSelect({ label, role, onChange }: { label: string; role: MemberRole; onChange: (role: MemberRole) => void }) {
  const t = useT();
  return (
    <Select
      aria-label={label}
      value={role}
      onChange={(value) => value && onChange(value === 'editor' ? 'editor' : 'viewer')}
      data={[
        { value: 'viewer', label: t('share.people.viewer') },
        { value: 'editor', label: t('share.people.editor') },
      ]}
      allowDeselect={false}
      size="xs"
      w={130}
    />
  );
}
