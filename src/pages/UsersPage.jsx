import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Snackbar,
  Switch,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import ToggleOnIcon from '@mui/icons-material/ToggleOn';
import ToggleOffIcon from '@mui/icons-material/ToggleOff';
import client from '../api/client';
import { formatDateTime } from '../utils/format';

const ROLE_LABELS = {
  OWNER: 'Majitel',
  SALES_REPRESENTATIVE: 'Obchodní zástupce',
  CUSTOMER: 'Zákazník',
};

const emptyForm = {
  username: '',
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  enabled: true,
  locked: false,
  roles: ['CUSTOMER'],
};

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [snack, setSnack] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(() => {
    client
      .get('/users')
      .then((res) => setUsers(res.data))
      .catch(() => setError('Nepodařilo se načíst uživatele.'));
  }, []);

  useEffect(load, [load]);

  const setLocked = async (user, locked) => {
    try {
      await client.post(`/users/${user.id}/locked/${locked}`);
      setSnack(locked ? 'Účet byl zamknut.' : 'Účet byl odemknut.');
      load();
    } catch {
      setError('Změna zámku účtu se nezdařila.');
    }
  };

  const setEnabled = async (user, enabled) => {
    try {
      await client.post(`/users/${user.id}/enabled/${enabled}`);
      setSnack(enabled ? 'Účet byl povolen.' : 'Účet byl zakázán.');
      load();
    } catch {
      setError('Změna stavu účtu se nezdařila.');
    }
  };

  const openForm = (user) => {
    setEditing(user || null);
    setForm(
      user
        ? {
            username: user.username || '',
            email: user.email || '',
            password: '',
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            enabled: user.enabled !== false,
            locked: !!user.locked,
            roles: user.roles && user.roles.length > 0 ? user.roles : ['CUSTOMER'],
          }
        : emptyForm
    );
    setFormError('');
    setFormOpen(true);
  };

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSave = async () => {
    if (!form.username.trim() || !form.email.trim() || !form.firstName.trim() || !form.lastName.trim()) {
      setFormError('Uživatelské jméno, e-mail, jméno a příjmení jsou povinné.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload = { ...form, password: form.password || null };
      if (editing) {
        await client.put(`/users/${editing.id}`, payload);
      } else {
        await client.post('/users', payload);
      }
      setSnack('Uživatel byl uložen.');
      setFormOpen(false);
      load();
    } catch {
      setFormError('Uložení uživatele se nezdařilo.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await client.delete(`/users/${deleting.id}`);
      setSnack('Uživatel byl smazán.');
      load();
    } catch {
      setError('Smazání uživatele se nezdařilo.');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          Uživatelé
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => openForm(null)}>
          Nový uživatel
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Uživatelské jméno</TableCell>
              <TableCell>Jméno</TableCell>
              <TableCell>E-mail</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Poslední přihlášení</TableCell>
              <TableCell>Stav</TableCell>
              <TableCell align="right">Akce</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id} hover>
                <TableCell>{u.username}</TableCell>
                <TableCell>
                  {[u.firstName, u.lastName].filter(Boolean).join(' ') || '—'}
                </TableCell>
                <TableCell>{u.email || '—'}</TableCell>
                <TableCell>
                  {(u.roles || []).map((r) => (
                    <Chip key={r} size="small" label={ROLE_LABELS[r] || r} sx={{ mr: 0.5 }} />
                  ))}
                </TableCell>
                <TableCell>{formatDateTime(u.lastLoginAt)}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={u.enabled ? (u.locked ? 'Zamknutý' : 'Aktivní') : 'Zakázaný'}
                    color={u.enabled ? (u.locked ? 'warning' : 'success') : 'default'}
                  />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Upravit">
                    <IconButton size="small" onClick={() => openForm(u)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={u.locked ? 'Odemknout účet' : 'Zamknout účet'}>
                    <IconButton size="small" onClick={() => setLocked(u, !u.locked)}>
                      {u.locked ? <LockOpenIcon fontSize="small" /> : <LockIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={u.enabled ? 'Zakázat účet' : 'Povolit účet'}>
                    <IconButton size="small" onClick={() => setEnabled(u, !u.enabled)}>
                      {u.enabled ? (
                        <ToggleOffIcon fontSize="small" />
                      ) : (
                        <ToggleOnIcon fontSize="small" color="success" />
                      )}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Smazat">
                    <IconButton size="small" onClick={() => setDeleting(u)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    Žádní uživatelé.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Upravit uživatele' : 'Nový uživatel'}</DialogTitle>
        <DialogContent dividers>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Uživatelské jméno"
                value={form.username}
                onChange={set('username')}
                required
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="E-mail"
                value={form.email}
                onChange={set('email')}
                required
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Jméno"
                value={form.firstName}
                onChange={set('firstName')}
                required
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Příjmení"
                value={form.lastName}
                onChange={set('lastName')}
                required
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label={editing ? 'Nové heslo (nepovinné)' : 'Heslo'}
                type="password"
                value={form.password}
                onChange={set('password')}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Role"
                value={form.roles}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    roles: typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value,
                  }))
                }
                SelectProps={{ multiple: true }}
                fullWidth
              >
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.enabled}
                    onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
                  />
                }
                label="Povolený"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={form.locked}
                    onChange={(e) => setForm((f) => ({ ...f, locked: e.target.checked }))}
                  />
                }
                label="Zamknutý"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)}>Zrušit</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Ukládám…' : 'Uložit'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleting} onClose={() => setDeleting(null)}>
        <DialogTitle>Smazat uživatele?</DialogTitle>
        <DialogContent>
          <Typography>
            Opravdu chcete smazat uživatele <strong>{deleting?.username}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleting(null)}>Zrušit</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>
            Smazat
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!snack}
        autoHideDuration={4000}
        onClose={() => setSnack('')}
        message={snack}
      />
    </Box>
  );
}
