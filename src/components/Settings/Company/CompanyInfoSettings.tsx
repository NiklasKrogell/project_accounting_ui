import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Box, TextField, Typography } from '@mui/material';
import { useAuth } from '../../../auth/AuthContext';
import { companyInfoApi } from '../../../api/companyInfo';
import type { CompanyInfo, CompanyInfoPatch } from '../../../types/settings';
import { SettingsSection } from '../SettingsSection';

type EditableField = keyof CompanyInfoPatch;

const EDITABLE_FIELDS: EditableField[] = [
  'name',
  'billingEmail',
  'billingAddress',
  'billingPostalCode',
  'billingCity',
  'billingCountry',
];

// Upper bounds of the backend's patch schema (company-info.controller.ts).
const MAX_LENGTH: Record<EditableField, number> = {
  name: 200,
  billingEmail: 254,
  billingAddress: 200,
  billingPostalCode: 20,
  billingCity: 100,
  billingCountry: 100,
};

// Company settings for the company's own details: its name, business ID and
// billing details. The business ID identifies the company and is shown but
// can't be changed. The details belong to the active company, so they are
// reloaded whenever that changes. Everyone with access can view them; changing
// them requires being a company administrator, whatever the accounting role
// (mirrors the backend).
export function CompanyInfoSettings() {
  const { t } = useTranslation();
  const { activeMembership, refreshSession } = useAuth();
  const companyId = activeMembership?.companyId;
  const canEdit = activeMembership?.isAdmin ?? false;

  // What the backend has, and the draft being edited.
  const [stored, setStored] = useState<CompanyInfo | null>(null);
  const [draft, setDraft] = useState<CompanyInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    // Guards against a slow response for the previous company landing after
    // the user has switched to another one.
    let stale = false;
    setStored(null);
    setDraft(null);
    setLoadError(null);
    companyInfoApi
      .get()
      .then((info) => {
        if (stale) return;
        setStored(info);
        setDraft(info);
      })
      .catch((err) => {
        if (!stale) setLoadError((err as Error).message);
      });
    return () => {
      stale = true;
    };
  }, [companyId]);

  const changed = EDITABLE_FIELDS.filter(
    (field) => stored !== null && draft !== null && draft[field].trim() !== stored[field],
  );
  const complete = draft !== null && EDITABLE_FIELDS.every((field) => draft[field].trim() !== '');

  // Only the fields that changed are sent.
  async function save() {
    if (!draft) return;
    const patch: CompanyInfoPatch = {};
    for (const field of changed) patch[field] = draft[field].trim();
    const saved = await companyInfoApi.update(patch);
    setStored(saved);
    setDraft(saved);
    // The company's name is also shown from the session (company switcher,
    // settings menu), so that has to pick the new one up.
    if (patch.name !== undefined) await refreshSession();
  }

  const field = (name: EditableField, type = 'text') => (
    <TextField
      label={t(`companyInfo.${name}`)}
      type={type}
      value={draft?.[name] ?? ''}
      onChange={(e) => setDraft((current) => current && { ...current, [name]: e.target.value })}
      disabled={!canEdit || draft === null}
      required
      fullWidth
      slotProps={{ htmlInput: { maxLength: MAX_LENGTH[name] } }}
    />
  );

  return (
    <SettingsSection
      // Remounted per company so a "saved" note or error never carries over.
      key={companyId}
      title={t('companyInfo.title')}
      dirty={changed.length > 0 && complete}
      onSave={save}
      readOnlyNote={canEdit ? undefined : t('companyInfo.readOnlyNote')}
    >
      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      )}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 480 }}>
        <Typography variant="subtitle1" component="h2">
          {t('companyInfo.basics')}
        </Typography>
        {field('name')}
        <TextField
          label={t('companyInfo.businessId')}
          value={draft?.businessId ?? ''}
          helperText={canEdit ? t('companyInfo.businessIdHint') : undefined}
          disabled
          fullWidth
        />
        <Typography variant="subtitle1" component="h2" sx={{ mt: 1 }}>
          {t('companyInfo.billing')}
        </Typography>
        {field('billingEmail', 'email')}
        {field('billingAddress')}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Box sx={{ width: 160, flexShrink: 0 }}>{field('billingPostalCode')}</Box>
          {field('billingCity')}
        </Box>
        {field('billingCountry')}
      </Box>
    </SettingsSection>
  );
}
