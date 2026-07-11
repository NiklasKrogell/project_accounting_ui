import { useTranslation } from 'react-i18next';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Box,
  Button,
  MenuItem,
  Select,
  Tab,
  Tabs,
  Toolbar,
  Typography,
  type SelectChangeEvent,
} from '@mui/material';
import { changeLanguage, SUPPORTED_LANGUAGES, type Language } from '../i18n';
import { useAuth } from '../auth/AuthContext';
import SubscriptionRequired from '../pages/SubscriptionRequired';

function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  return (
    <Select
      size="small"
      value={i18n.language}
      onChange={(e: SelectChangeEvent) => changeLanguage(e.target.value as Language)}
      title={t('common.language')}
      aria-label={t('common.language')}
      sx={{ mr: 2 }}
    >
      {SUPPORTED_LANGUAGES.map((lng) => (
        <MenuItem key={lng} value={lng}>
          {t(`languages.${lng}`)}
        </MenuItem>
      ))}
    </Select>
  );
}

export default function Layout() {
  const { t } = useTranslation();
  const { user, memberships, activeCompanyId, activeMembership, logout, switchCompany } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const subscriptionActive = activeMembership?.subscriptionStatus === 'ACTIVE';
  const activeTab = location.pathname === '/fiscal-years' ? '/fiscal-years' : '/';

  return (
    <>
      <AppBar position="static" color="default" elevation={0}>
        <Toolbar>
          <Typography variant="h6" component="span" sx={{ fontWeight: 700, mr: 2 }}>
            {t('common.appName')}
          </Typography>
          {memberships.length > 0 && (
            <Select
              size="small"
              value={activeCompanyId ?? ''}
              onChange={(e: SelectChangeEvent) => switchCompany(e.target.value)}
              title={t('nav.dashboard')}
              sx={{ mr: 2 }}
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

      {subscriptionActive && (
        <Tabs value={activeTab} onChange={(_, value: string) => navigate(value)}>
          <Tab label={t('nav.dashboard')} value="/" />
          <Tab label={t('nav.fiscalYears')} value="/fiscal-years" />
        </Tabs>
      )}

      <Box
        component="main"
        sx={
          subscriptionActive
            ? { maxWidth: 900, mx: 'auto', p: 3 }
            : { display: 'flex', justifyContent: 'center', p: 6 }
        }
      >
        {subscriptionActive ? <Outlet /> : <SubscriptionRequired />}
      </Box>
    </>
  );
}
