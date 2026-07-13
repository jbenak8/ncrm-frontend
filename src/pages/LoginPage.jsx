import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useAuth } from '../auth/AuthContext';
import Footer from '../components/Footer';

export default function LoginPage() {
  const { authMode, loginBasic, loginKeycloak } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginBasic(username.trim(), password);
    } catch (err) {
      if (err.response && err.response.status === 401) {
        setError('Neplatné uživatelské jméno nebo heslo.');
      } else {
        setError('Přihlášení se nezdařilo. Zkontrolujte, zda běží backend.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
      }}
    >
      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
        }}
      >
        <Card sx={{ maxWidth: 420, width: '100%' }}>
          <CardContent sx={{ p: 4 }}>
            <Stack spacing={2} alignItems="center">
              <Box
                sx={{
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  borderRadius: '50%',
                  p: 1.5,
                  display: 'flex',
                }}
              >
                <LockOutlinedIcon />
              </Box>
              <Typography variant="h5" fontWeight={700}>
                nCRM
              </Typography>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                Přihlaste se ke svému CRM účtu
              </Typography>

              {error && (
                <Alert severity="error" sx={{ width: '100%' }}>
                  {error}
                </Alert>
              )}

              {authMode === 'keycloak' ? (
                <Button variant="contained" size="large" fullWidth onClick={loginKeycloak}>
                  Přihlásit se přes Keycloak
                </Button>
              ) : (
                <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
                  <Stack spacing={2}>
                    <TextField
                      label="Uživatelské jméno"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoFocus
                      required
                      fullWidth
                    />
                    <TextField
                      label="Heslo"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      fullWidth
                    />
                    <Button
                      type="submit"
                      variant="contained"
                      size="large"
                      fullWidth
                      disabled={loading}
                      startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
                    >
                      Přihlásit se
                    </Button>
                  </Stack>
                </Box>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Box>
      <Footer />
    </Box>
  );
}
