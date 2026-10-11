import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { useAuth } from '../auth/AuthContext';
import SubscriptionRequired from '../pages/SubscriptionRequired';
import NoCompany from '../pages/NoCompany';
import { CustomAppBar } from '../components/Header/CustomAppBar';
import { TabBar } from '../components/Header/TabBar';
import {
  resolveActiveTab,
  SETTINGS_PATH,
  WINDOW_FILLING_PATHS,
  type NavAction,
} from '../components/Header/navConfig';
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
  // A page of panes that scroll on their own gets the area under the tabs and
  // no more: the layout is then exactly as tall as the window.
  const fillsWindow = subscriptionActive && WINDOW_FILLING_PATHS.includes(location.pathname);
  // The settings page brings its own side menu, which has to reach the left
  // edge of the page, so it opts out of the centered content column too.
  const fullBleed = activeTab === SETTINGS_PATH || fillsWindow;

  const handleAction = (action: NavAction) => {
    if (action === 'newJournalEntry') {
      openCreate({ onSaved: () => navigate('/accounting/journal') });
    }
  };

  return (
    // Column flex so a full-bleed page can fill the height below the tabs.
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        ...(fillsWindow && { height: '100vh' }),
      }}
    >
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
              ? { display: 'flex', flexGrow: 1, ...(fillsWindow && { minHeight: 0 }) }
              : { width: '100%', maxWidth: 900, mx: 'auto', p: 3 }
        }
      >
        {subscriptionActive ? <Outlet /> : activeMembership ? <SubscriptionRequired /> : <NoCompany />}
      </Box>
    </Box>
  );
}
