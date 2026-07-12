import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { useAuth } from '../auth/AuthContext';
import SubscriptionRequired from '../pages/SubscriptionRequired';
import { CustomAppBar } from '../components/Header/CustomAppBar';
import { TabBar } from '../components/Header/TabBar';

export default function Layout() {
  const { activeMembership } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const subscriptionActive = activeMembership?.subscriptionStatus === 'ACTIVE';
  const activeTab = location.pathname === '/fiscal-years' ? '/fiscal-years' : '/';

  return (
    <>
      {/* AppBar */}
      <CustomAppBar/>

      {/* Tabs */}
      <TabBar 
        subscriptionActive={subscriptionActive}
        activeTab={activeTab}
        navigate={navigate}
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
