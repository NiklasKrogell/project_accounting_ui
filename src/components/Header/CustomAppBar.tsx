// CustomAppBar.tsx
import React from 'react';
import { AppBar, Box, Button, MenuItem, Select, Toolbar, Typography, type SelectChangeEvent, } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { changeLanguage, SUPPORTED_LANGUAGES, type Language } from '../../i18n';
import { useAuth } from '../../auth/AuthContext';
import {theme} from '../../theme';

export const CustomAppBar: React.FC = () => {
    const { t } = useTranslation();
    const { user, memberships, activeCompanyId, logout, switchCompany } = useAuth();

    return(
        <AppBar position="static" style={{ backgroundColor: theme.palette.primary.main }} elevation={0}>
            <Toolbar>
              <Typography variant="h6" component="span" sx={{ fontWeight: 700, mr: 2 }}>
                {t('common.appName')}
              </Typography>
              {memberships.length > 0 && (
                <Select
                  size="small"
                  value={activeCompanyId ?? ''}
                  onChange={(e: SelectChangeEvent) => switchCompany(e.target.value)}
                  title={t('common.company')}
                  aria-label={t('common.company')}
                  sx={{ mr: 2, border: `2px solid ${theme.palette.secondary.main}`, backgroundColor: "white", color: "black" }}
                >
                {memberships.map((m) => (
                    <MenuItem key={m.companyId} value={m.companyId}>
                      {m.companyName}
                      {m.subscriptionStatus !== 'ACTIVE' ? ` (${t('common.inactive')})` : ''}
                    </MenuItem>
                  ))}
                </Select>
                )}
                <Box sx={{ flexGrow: 1 }} />

                <LanguageSwitcher />

                <Typography sx={{ mr: 2 }}>
                    {user?.firstName} {user?.lastName}
                </Typography>

                <Button color="inherit" onClick={logout}>
                    {t('common.logout')}
                </Button>
            </Toolbar>
        </AppBar>
    )
}

const LanguageSwitcher: React.FC = () => {
  const { t, i18n } = useTranslation();
  return (
    <Select
      size="small"
      value={i18n.language}
      onChange={(e: SelectChangeEvent) => changeLanguage(e.target.value as Language)}
      title={t('common.language')}
      aria-label={t('common.language')}
      sx={{ mr: 2, border: `2px solid ${theme.palette.secondary.main}`, backgroundColor: "white", color: "black" }}
    >
      {SUPPORTED_LANGUAGES.map((lng) => (
        <MenuItem key={lng} value={lng}>
          {t(`languages.${lng}`)}
        </MenuItem>
      ))}
    </Select>
  );
}
