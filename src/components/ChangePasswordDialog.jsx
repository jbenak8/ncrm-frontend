import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import client from '../api/client';
import { isPasswordValid, PASSWORD_POLICY_DESCRIPTION } from '../utils/password';

/**
 * Dialog for changing the password of the logged-in user. In the "forced" mode
 * (mustChangePassword / credentialsExpired flag) it cannot be dismissed and the
 * user cannot continue working until the password is changed.
 */
export default function ChangePasswordDialog({ open, forced = false, onClose, onChanged }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [nextAgain, setNextAgain] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setCurrent('');
      setNext('');
      setNextAgain('');
      setError('');
    }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isPasswordValid(next)) {
      setError(PASSWORD_POLICY_DESCRIPTION);
      return;
    }
    if (next !== nextAgain) {
      setError('Nová hesla se neshodují.');
      return;
    }
    if (next === current) {
      setError('Nové heslo musí být odlišné od původního.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await client.post('/users/change-password', {
        currentPassword: current,
        newPassword: next,
      });
      onChanged?.();
    } catch (err) {
      if (err.response && err.response.status === 400) {
        setError('Původní heslo není správné, nebo nové heslo nesplňuje politiku hesel.');
      } else {
        setError('Změnu hesla se nepodařilo provést.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={forced ? undefined : onClose}
      disableEscapeKeyDown={forced}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>Změna hesla</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent dividers>
          <Stack spacing={2}>
            {forced && (
              <Alert severity="warning">
                Vaše heslo je nutné změnit. Bez změny hesla nelze pokračovat.
              </Alert>
            )}
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Původní heslo"
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoFocus
              required
              fullWidth
            />
            <TextField
              label="Nové heslo"
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
              fullWidth
              error={!!next && !isPasswordValid(next)}
            />
            <TextField
              label="Nové heslo znovu"
              type="password"
              value={nextAgain}
              onChange={(e) => setNextAgain(e.target.value)}
              required
              fullWidth
              error={!!nextAgain && next !== nextAgain}
              helperText={nextAgain && next !== nextAgain ? 'Hesla se neshodují.' : ''}
            />
            <Typography variant="caption" color="text.secondary">
              {PASSWORD_POLICY_DESCRIPTION}
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          {!forced && <Button onClick={onClose}>Zrušit</Button>}
          <Button
            type="submit"
            variant="contained"
            disabled={saving}
            startIcon={saving ? <CircularProgress size={18} color="inherit" /> : null}
          >
            Změnit heslo
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
