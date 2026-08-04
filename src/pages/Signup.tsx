import { Box } from '@mui/material';
import { SignupForm } from '../components/Auth/SignupForm';

export default function Signup() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
      <SignupForm />
    </Box>
  );
}
