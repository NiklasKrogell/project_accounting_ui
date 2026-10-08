import { Link, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Box, List, ListItemButton, ListItemText } from '@mui/material';
import { SETTINGS_PATH } from '../components/Header/navConfig';

// Sections of the settings side menu. `path` is the child route under
// /settings (registered in App.tsx); add new sections here and there.
export const SETTINGS_SECTIONS = [{ path: 'general', labelKey: 'settings.sections.general' }];

// Settings shell: a side menu on the left edge of the page and the selected
// section (a child route) beside it. Layout renders this page full-bleed, so
// the menu sits against the viewport edge and runs the full height.
export default function Settings() {
  const { t } = useTranslation();
  const { pathname } = useLocation();

  return (
    <Box sx={{ display: 'flex', flexGrow: 1 }}>
      <Box
        component="nav"
        aria-label={t('settings.title')}
        sx={{ width: 240, flexShrink: 0, borderRight: 1, borderColor: 'divider' }}
      >
        <List>
          {SETTINGS_SECTIONS.map((section) => (
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
      </Box>

      <Box sx={{ flexGrow: 1, minWidth: 0, maxWidth: 900, p: 3 }}>
        <Outlet />
      </Box>
    </Box>
  );
}
