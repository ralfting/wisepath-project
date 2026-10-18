'use client';

import { Badge, Button, Group, Stack, Text } from '@mantine/core';
import type { Path } from '@wisepath/domain/paths';
import { useT } from '@/i18n/I18nProvider';
import type { TranslationKey } from '@/i18n/I18nProvider';
import type { CatalogState } from '@/useCases/paths';
import { CatalogForm } from './CatalogForm';
import { useCatalogSection } from './useCatalogSection';

/** What each state says, and what the owner can do from it */
interface StateCopy {
  readonly status: TranslationKey | null;
  readonly color: string;
  readonly hint: TranslationKey;
  readonly edit: TranslationKey;
  readonly withdraw: TranslationKey | null;
}

const COPY: Record<CatalogState, StateCopy> = {
  none: { status: null, color: 'gray', hint: 'share.catalog.noneHint', edit: 'share.catalog.ask', withdraw: null },
  pending: {
    status: 'share.catalog.pending',
    color: 'blue',
    hint: 'share.catalog.pendingHint',
    edit: 'share.catalog.edit',
    withdraw: 'share.catalog.withdraw',
  },
  declined: { status: 'share.catalog.declined', color: 'gray', hint: 'share.catalog.declinedHint', edit: 'share.catalog.askAgain', withdraw: null },
  published: {
    status: 'share.catalog.published',
    color: 'teal',
    hint: 'share.catalog.publishedHint',
    edit: 'share.catalog.edit',
    withdraw: 'share.catalog.unpublish',
  },
};

/** Asking to list the path in the WisePath catalog, and where that request stands */
export function CatalogSection({ path }: { path: Path }) {
  const t = useT();
  const { state, operations } = useCatalogSection(path);
  const copy = COPY[state.catalog];

  return (
    <Stack gap="xs">
      <Group gap="xs">
        <Text fw={700} size="sm">
          {t('share.catalog.label')}
        </Text>
        {copy.status && (
          <Badge variant="light" color={copy.color}>
            {t(copy.status)}
          </Badge>
        )}
      </Group>
      {state.editing ? (
        <CatalogForm path={path} state={state.catalog} onDone={operations.closeForm} />
      ) : (
        <>
          <Text size="sm" c="dimmed">
            {t(copy.hint)}
          </Text>
          <Group gap="xs">
            <Button variant="default" size="xs" onClick={operations.edit}>
              {t(copy.edit)}
            </Button>
            {copy.withdraw && (
              <Button variant="subtle" color="red" size="xs" loading={state.busy} onClick={() => void operations.withdraw()}>
                {t(copy.withdraw)}
              </Button>
            )}
          </Group>
        </>
      )}
      {state.error && (
        <Text size="sm" c="red" role="alert">
          {state.error}
        </Text>
      )}
    </Stack>
  );
}
