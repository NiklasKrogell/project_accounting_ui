import { Box } from '@mui/material';
import { ChangePasswordForm } from '../components/Auth/ChangePasswordForm';

export default function ChangePassword() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
      <ChangePasswordForm />
    </Box>
  );
}
