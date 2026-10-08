import { useTranslation } from 'react-i18next';
import { Box, Card, CardContent, MenuItem, TextField, Typography } from '@mui/material';
import { changeLanguage, SUPPORTED_LANGUAGES, type Language } from '../../i18n';

// The "General settings" section of the settings page. The language is a
// per-browser preference (persisted by changeLanguage), not a company setting.
export function GeneralSettings() {
  const { t, i18n } = useTranslation();

  return (
    <Box>
      <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
        {t('settings.sections.general')}
      </Typography>

      <Card>
        <CardContent>
          <TextField
            select
            size="small"
            label={t('settings.general.language')}
            helperText={t('settings.general.languageHint')}
            value={i18n.language}
            onChange={(e) => changeLanguage(e.target.value as Language)}
            sx={{ minWidth: 240 }}
          >
            {SUPPORTED_LANGUAGES.map((lng) => (
              <MenuItem key={lng} value={lng}>
                {t(`languages.${lng}`)}
              </MenuItem>
            ))}
          </TextField>
        </CardContent>
      </Card>
    </Box>
  );
}
