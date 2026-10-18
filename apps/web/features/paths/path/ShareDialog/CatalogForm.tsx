'use client';

import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { Button, Group, Select, Stack, Text, TextInput } from '@mantine/core';
import type { Path } from '@wisepath/domain/paths';
import { publicationFormSchema, useRequestPublication } from '@/useCases/paths';
import type { CatalogState } from '@/useCases/paths';
import { useDomainMessage } from '@/useCases/validation';
import { useLocale, useT } from '@/i18n/I18nProvider';
import { LOCALES, LOCALE_NAMES, isLocale } from '@/i18n/locales';
import { fieldError } from '@/shared/forms';

interface CatalogFormProps {
  readonly path: Path;
  readonly state: CatalogState;
  readonly onDone: () => void;
}

/** What the catalog shows of the path: what it teaches, who it is for, its language; sent for review unless published */
export function CatalogForm({ path, state, onDone }: CatalogFormProps) {
  const t = useT();
  const { locale } = useLocale();
  const request = useRequestPublication();
  const domain = useDomainMessage();
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      description: path.description ?? '',
      audience: path.audience ?? '',
      language: path.language ?? locale,
    },
    validators: { onSubmit: publicationFormSchema },
    onSubmit: async ({ value }) => {
      setError(null);
      const failure = await request(path, value, state);
      if (failure) setError(failure);
      else onDone();
    },
  });

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <Stack gap="sm">
        <form.Field name="description">
          {(field) => (
            <TextInput
              label={t('share.catalog.description')}
              placeholder={t('share.catalog.descriptionPlaceholder')}
              value={field.state.value}
              onChange={(event) => field.handleChange(event.currentTarget.value)}
              onBlur={field.handleBlur}
              error={domain(fieldError(field.state.meta.errors))}
              required
              data-autofocus
            />
          )}
        </form.Field>
        <form.Field name="audience">
          {(field) => (
            <TextInput
              label={t('share.catalog.audience')}
              placeholder={t('share.catalog.audiencePlaceholder')}
              value={field.state.value}
              onChange={(event) => field.handleChange(event.currentTarget.value)}
              onBlur={field.handleBlur}
              error={domain(fieldError(field.state.meta.errors))}
              required
            />
          )}
        </form.Field>
        <form.Field name="language">
          {(field) => (
            <Select
              label={t('share.catalog.language')}
              value={field.state.value}
              onChange={(value) => isLocale(value) && field.handleChange(value)}
              data={LOCALES.map((option) => ({ value: option, label: LOCALE_NAMES[option] }))}
              allowDeselect={false}
            />
          )}
        </form.Field>
        {state !== 'published' && (
          <Text size="xs" c="dimmed">
            {t('share.catalog.consent')}
          </Text>
        )}
        {error && (
          <Text size="sm" c="red" role="alert">
            {error}
          </Text>
        )}
        <Group justify="flex-end" gap="xs">
          <Button variant="default" size="xs" onClick={onDone}>
            {t('share.catalog.cancel')}
          </Button>
          <form.Subscribe selector={(formState) => formState.isSubmitting}>
            {(isSubmitting) => (
              <Button type="submit" size="xs" loading={isSubmitting}>
                {t(state === 'published' ? 'share.catalog.save' : 'share.catalog.send')}
              </Button>
            )}
          </form.Subscribe>
        </Group>
      </Stack>
    </form>
  );
}
