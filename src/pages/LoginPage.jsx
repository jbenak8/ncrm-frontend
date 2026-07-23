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
import appLogo from '../assets/nCRM_logo2.png';

export default function LoginPage() {
  const { authMode, loginBasic, loginDb, loginKeycloak } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // The "db" mode logs in against the backend database (db-auth profile),
      // any other non-keycloak mode falls back to HTTP Basic (local profile).
      const login = authMode === 'db' ? loginDb : loginBasic;
      await login(username.trim(), password);
    } catch (err) {
      if (err.accountFlag === 'disabled') {
        setError('Váš účet je zakázán. Kontaktujte prosím administrátora.');
      } else if (err.accountFlag === 'locked') {
        setError('Váš účet je zamknut. Kontaktujte prosím administrátora.');
      } else if (err.response && err.response.status === 401) {
        setError('Neplatné uživatelské jméno nebo heslo.');
      } else if (err.response && err.response.status === 403) {
        setError('Přihlášení bylo odmítnuto. Účet může být zakázán nebo zamknut.');
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
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Semi-transparent application logo in the background of the login screen. */}
      <Box
        component="img"
        src={appLogo}
        alt=""
        aria-hidden
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: { xs: '90%', md: '60%' },
          maxWidth: 900,
          opacity: 0.06,
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      />
      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
        }}
      >
        <Card sx={{ maxWidth: 420, width: '100%', position: 'relative' }}>
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
              <Box component="img" src={appLogo} alt="nCRM" sx={{ height: 56, objectFit: 'contain' }} />
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
