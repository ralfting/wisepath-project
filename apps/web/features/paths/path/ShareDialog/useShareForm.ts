'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import type { MemberRole } from '@wisepath/domain/paths';
import { useSharePath } from '@/useCases/paths';
import { useT } from '@/i18n/I18nProvider';

/** The share form: the email, the access to give, its error, and sending it; the field empties once it worked */
export function useShareForm(pathId: string) {
  const share = useSharePath();
  const t = useT();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MemberRole>('viewer');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const changeEmail = (value: string) => {
    setEmail(value);
    setError(null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return setError(t('auth.validation.email'));
    setBusy(true);
    const result = await share(pathId, email, role);
    setBusy(false);
    if (!result.ok) return setError(result.message);
    setEmail('');
  };

  return {
    state: { email, role, error, busy },
    operations: { changeEmail, changeRole: (value: string) => setRole(value === 'editor' ? 'editor' : 'viewer'), submit },
  };
}
