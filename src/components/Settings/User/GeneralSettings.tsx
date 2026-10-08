import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MenuItem, TextField } from '@mui/material';
import { SUPPORTED_LANGUAGES, type Language } from '../../../i18n';
import { useAuth } from '../../../auth/AuthContext';
import { SettingsSection } from '../SettingsSection';

// The user's "General settings" section. The language is a user setting: it is
// saved to the user and follows them into every company. The select edits a
// draft; the app switches language once the save has gone through (AuthContext
// applies the saved settings).
export function GeneralSettings() {
  const { t, i18n } = useTranslation();
  const { settings, updateUserSettings } = useAuth();
  const savedLanguage = settings?.language ?? (i18n.language as Language);
  const [language, setLanguage] = useState<Language>(savedLanguage);

  return (
    <SettingsSection
      title={t('settings.sections.general')}
      dirty={language !== savedLanguage}
      onSave={() => updateUserSettings({ language })}
    >
      <TextField
        select
        size="small"
        label={t('settings.general.language')}
        helperText={t('settings.general.languageHint')}
        value={language}
        onChange={(e) => setLanguage(e.target.value as Language)}
        sx={{ minWidth: 240 }}
      >
        {SUPPORTED_LANGUAGES.map((lng) => (
          <MenuItem key={lng} value={lng}>
            {t(`languages.${lng}`)}
          </MenuItem>
        ))}
      </TextField>
    </SettingsSection>
  );
}
