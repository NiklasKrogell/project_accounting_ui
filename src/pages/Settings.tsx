import { Link, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Box, List, ListItemButton, ListItemText, ListSubheader, Typography } from '@mui/material';
import { useAuth } from '../auth/AuthContext';
import { SETTINGS_PATH } from '../components/Header/navConfig';

// The two kinds of settings. User settings belong to the logged-in user and
// follow them into every company (saved via useAuth().updateUserSettings).
// Company settings belong to the active company only: their sections load from
// company-scoped endpoints and reload when the active company changes.
export type SettingsScope = 'user' | 'company';

const SETTINGS_SCOPES: { scope: SettingsScope; labelKey: string }[] = [
  { scope: 'user', labelKey: 'settings.scopes.user' },
  { scope: 'company', labelKey: 'settings.scopes.company' },
];

// Sections of the settings side menu. `path` is the child route under
// /settings (registered in App.tsx) and starts with the section's scope; add
// new sections here and there.
export const SETTINGS_SECTIONS: { scope: SettingsScope; path: string; labelKey: string }[] = [
  { scope: 'user', path: 'user/general', labelKey: 'settings.sections.general' },
  { scope: 'company', path: 'company/info', labelKey: 'companyInfo.title' },
  { scope: 'company', path: 'company/vat-accounts', labelKey: 'vatAccounts.title' },
  { scope: 'company', path: 'company/bank', labelKey: 'bankSettings.title' },
];

// Settings shell: a side menu on the left edge of the page, grouped by scope,
// and the selected section (a child route) beside it. Layout renders this page
// full-bleed, so the menu sits against the viewport edge and runs the full
// height.
export default function Settings() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { activeMembership } = useAuth();

  return (
    <Box sx={{ display: 'flex', flexGrow: 1 }}>
      <Box
        component="nav"
        aria-label={t('settings.title')}
        sx={{ width: 240, flexShrink: 0, borderRight: 1, borderColor: 'divider' }}
      >
        {SETTINGS_SCOPES.map(({ scope, labelKey }) => (
          <List
            key={scope}
            disablePadding
            sx={{ '& + &': { mt: 2 } }}
            aria-labelledby={`settings-scope-${scope}`}
            subheader={
              <ListSubheader
                id={`settings-scope-${scope}`}
                component="div"
                disableSticky
                sx={{
                  lineHeight: 1.5,
                  py: 1,
                  bgcolor: 'primary.light',
                  borderBottom: 1,
                  borderColor: 'common.black',
                  color: 'primary.contrastText',
                }}
              >
                {t(labelKey)}
                {/* Names the company whose settings these are. */}
                {scope === 'company' && activeMembership && (
                  <Typography variant="caption" component="div" noWrap>
                    {activeMembership.companyName}
                  </Typography>
                )}
              </ListSubheader>
            }
          >
            {SETTINGS_SECTIONS.filter((section) => section.scope === scope).map((section) => (
              <ListItemButton
                key={section.path}
                component={Link}
                to={section.path}
                selected={pathname === `${SETTINGS_PATH}/${section.path}`}
              >
                <ListItemText primary={t(section.labelKey)} />
              </ListItemButton>
            ))}
          </List>
        ))}
      </Box>

      <Box sx={{ flexGrow: 1, minWidth: 0, maxWidth: 900, p: 3 }}>
        <Outlet />
      </Box>
    </Box>
  );
}
