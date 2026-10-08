import { Navigate, Route, Routes } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import './i18n';
import { AuthProvider, useAuth } from './auth/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Home from './pages/Home';
import FiscalYears from './pages/FiscalYears';
import Journal from './pages/Journal';
import ChartOfAccounts from './pages/ChartOfAccounts';
import CostCenters from './pages/CostCenters';
import GeneralLedger from './pages/GeneralLedger';
import IncomeStatement from './pages/IncomeStatement';
import BalanceSheet from './pages/BalanceSheet';
import Settings, { SETTINGS_SECTIONS } from './pages/Settings';
import { GeneralSettings } from './components/Settings/User/GeneralSettings';
import { VatAccountsSettings } from './components/Settings/Company/VatAccountsSettings';
import { SETTINGS_PATH } from './components/Header/navConfig';
import ProtectedRoute from './routes/ProtectedRoute';
import PublicOnlyRoute from './routes/PublicOnlyRoute';
import Layout from './routes/Layout';

function AppRoutes() {
  const { t } = useTranslation();
  const { loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
        <Typography>{t('common.loading')}</Typography>
      </Box>
    );
  }

  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/fiscal-years" element={<FiscalYears />} />
          <Route path="/accounting/journal" element={<Journal />} />
          <Route path="/accounting/chart-of-accounts" element={<ChartOfAccounts />} />
          <Route path="/accounting/cost-centers" element={<CostCenters />} />
          <Route path="/accounting/general-ledger" element={<GeneralLedger />} />
          <Route path="/reports/income-statement" element={<IncomeStatement />} />
          <Route path="/reports/balance-sheet" element={<BalanceSheet />} />
          <Route path={SETTINGS_PATH} element={<Settings />}>
            <Route index element={<Navigate to={SETTINGS_SECTIONS[0].path} replace />} />
            <Route path="user/general" element={<GeneralSettings />} />
            <Route path="company/vat-accounts" element={<VatAccountsSettings />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
