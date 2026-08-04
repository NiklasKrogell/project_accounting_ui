import { Box } from '@mui/material';
import { LoginForm } from '../components/Auth/LoginForm';

export default function Login() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
      <LoginForm />
    </Box>
  );
}
