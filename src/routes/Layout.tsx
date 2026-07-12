import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { useAuth } from '../auth/AuthContext';
import SubscriptionRequired from '../pages/SubscriptionRequired';
import { CustomAppBar } from '../components/Header/CustomAppBar';
import { TabBar } from '../components/Header/TabBar';
import { resolveActiveTab, type NavAction } from '../components/Header/navConfig';
import {
  JournalEntryDialogProvider,
  useJournalEntryDialog,
} from '../components/JournalEntry/JournalEntryDialogContext';

// Split in two so LayoutContent can use hooks that need the dialog provider.
export default function Layout() {
  return (
    <JournalEntryDialogProvider>
      <LayoutContent />
    </JournalEntryDialogProvider>
  );
}

function LayoutContent() {
  const { activeMembership } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { openCreate } = useJournalEntryDialog();

  const subscriptionActive = activeMembership?.subscriptionStatus === 'ACTIVE';
  const activeTab = resolveActiveTab(location.pathname);

  const handleAction = (action: NavAction) => {
    if (action === 'newJournalEntry') {
      openCreate({ onSaved: () => navigate('/accounting/journal') });
    }
  };

  return (
    <>
      {/* AppBar */}
      <CustomAppBar/>

      {/* Tabs */}
      <TabBar
        subscriptionActive={subscriptionActive}
        activeTab={activeTab}
        navigate={navigate}
        onAction={handleAction}
      />

      {/* Main content */}
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
