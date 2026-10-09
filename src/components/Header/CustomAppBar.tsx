// CustomAppBar.tsx
import React, { useState } from 'react';
import { AppBar, Box, Button, MenuItem, Select, Toolbar, Typography, type SelectChangeEvent, } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/AuthContext';
import { CompanyCreateDialog } from '../Company/CompanyCreateDialog';
import { InboxButton } from './InboxButton';
import {theme} from '../../theme';

// Value of the switcher's last entry. It is not a company to switch to: it
// opens the dialog for registering a new one.
const REGISTER_COMPANY = 'register-company';

export const CustomAppBar: React.FC = () => {
    const { t } = useTranslation();
    const { user, memberships, activeCompanyId, logout, switchCompany } = useAuth();
    const [registering, setRegistering] = useState(false);

    const handleCompanyChange = (e: SelectChangeEvent) => {
        if (e.target.value === REGISTER_COMPANY) setRegistering(true);
        else switchCompany(e.target.value);
    };

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
                  onChange={handleCompanyChange}
                  title={t('common.company')}
                  aria-label={t('common.company')}
                  sx={{ mr: 2, border: `2px solid ${theme.palette.secondary.main}`, backgroundColor: "white", color: "black" }}
                >
                {memberships.map((m, index) => (
                    // The line under the last company sets the entry below
                    // apart from the companies.
                    <MenuItem key={m.companyId} value={m.companyId} divider={index === memberships.length - 1}>
                      {m.companyName}
                      {m.subscriptionStatus !== 'ACTIVE' ? ` (${t('common.inactive')})` : ''}
                    </MenuItem>
                  ))}
                  <MenuItem value={REGISTER_COMPANY}>{t('companyCreate.open')}</MenuItem>
                </Select>
                )}
                <Box sx={{ flexGrow: 1 }} />

                <InboxButton />

                <Typography sx={{ mr: 2 }}>
                    {user?.firstName} {user?.lastName}
                </Typography>

                <Button color="inherit" onClick={logout}>
                    {t('common.logout')}
                </Button>
            </Toolbar>
            {/* A user with no company has no switcher; they register one from the NoCompany page. */}
            <CompanyCreateDialog open={registering} onClose={() => setRegistering(false)} />
        </AppBar>
    )
}
