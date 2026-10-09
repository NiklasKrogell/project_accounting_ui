import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { useAuth } from '../auth/AuthContext';
import SubscriptionRequired from '../pages/SubscriptionRequired';
import NoCompany from '../pages/NoCompany';
import { CustomAppBar } from '../components/Header/CustomAppBar';
import { TabBar } from '../components/Header/TabBar';
import { resolveActiveTab, SETTINGS_PATH, type NavAction } from '../components/Header/navConfig';
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
  // The settings page brings its own side menu, which has to reach the left
  // edge of the page, so it opts out of the centered content column.
  const fullBleed = activeTab === SETTINGS_PATH;

  const handleAction = (action: NavAction) => {
    if (action === 'newJournalEntry') {
      openCreate({ onSaved: () => navigate('/accounting/journal') });
    }
  };

  return (
    // Column flex so a full-bleed page can fill the height below the tabs.
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
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
          !subscriptionActive
            ? { display: 'flex', justifyContent: 'center', p: 6 }
            : fullBleed
              ? { display: 'flex', flexGrow: 1 }
              : { width: '100%', maxWidth: 900, mx: 'auto', p: 3 }
        }
      >
        {subscriptionActive ? <Outlet /> : activeMembership ? <SubscriptionRequired /> : <NoCompany />}
      </Box>
    </Box>
  );
}
