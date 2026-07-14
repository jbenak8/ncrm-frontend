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
  Grid,
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import ToggleOnIcon from '@mui/icons-material/ToggleOn';
import ToggleOffIcon from '@mui/icons-material/ToggleOff';
import client from '../../api/client';

const emptyForm = {
  code: '',
  userId: '',
  phone: '',
  businessEmail: '',
  region: '',
  note: '',
  active: true,
};

/**
 * Administration of sales representatives (owner only): create, edit and (de)activate
 * representatives linked to user accounts.
 */
export default function SalesRepresentativesPage() {
  const [reps, setReps] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snack, setSnack] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    client
      .get('/sales-representatives')
      .then((res) => setReps(res.data))
      .catch(() => setError('Nepodařilo se načíst obchodní zástupce.'))
      .finally(() => setLoading(false));
    client
      .get('/users')
      .then((res) => setUsers(res.data))
      .catch(() => setUsers([]));
  }, []);

  useEffect(load, [load]);

  const openForm = (rep) => {
    setEditing(rep || null);
    setForm(
      rep
        ? {
            code: rep.code || '',
            userId: rep.userId || '',
            phone: rep.phone || '',
            businessEmail: rep.businessEmail || '',
            region: rep.region || '',
            note: rep.note || '',
            active: rep.active !== false,
          }
        : emptyForm
    );
    setFormError('');
    setFormOpen(true);
  };

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSave = async () => {
    if (!form.code.trim() || !form.userId) {
      setFormError('Kód a uživatelský účet jsou povinné.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      if (editing) {
        await client.put(`/sales-representatives/${editing.id}`, form);
      } else {
        await client.post('/sales-representatives', form);
      }
      setSnack('Obchodní zástupce byl uložen.');
      setFormOpen(false);
      load();
    } catch {
      setFormError('Uložení obchodního zástupce se nezdařilo.');
    } finally {
      setSaving(false);
    }
  };

  const setActive = async (rep, active) => {
    try {
      await client.post(`/sales-representatives/${rep.id}/active/${active}`);
      setSnack(active ? 'Zástupce byl aktivován.' : 'Zástupce byl deaktivován.');
      load();
    } catch {
      setError('Změna stavu zástupce se nezdařila.');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          Obchodní zástupci
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => openForm(null)}>
          Nový zástupce
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        {loading && <LinearProgress />}
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Kód</TableCell>
              <TableCell>Jméno</TableCell>
              <TableCell>E-mail</TableCell>
              <TableCell>Telefon</TableCell>
              <TableCell>Region</TableCell>
              <TableCell>Stav</TableCell>
              <TableCell align="right">Akce</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {reps.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell>{r.code || '—'}</TableCell>
                <TableCell>
                  {[r.firstName, r.lastName].filter(Boolean).join(' ') || '—'}
                </TableCell>
                <TableCell>{r.businessEmail || '—'}</TableCell>
                <TableCell>{r.phone || '—'}</TableCell>
                <TableCell>{r.region || '—'}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={r.active !== false ? 'Aktivní' : 'Neaktivní'}
                    color={r.active !== false ? 'success' : 'default'}
                  />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Upravit">
                    <IconButton size="small" onClick={() => openForm(r)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={r.active !== false ? 'Deaktivovat' : 'Aktivovat'}>
                    <IconButton size="small" onClick={() => setActive(r, r.active === false)}>
                      {r.active !== false ? (
                        <ToggleOffIcon fontSize="small" />
                      ) : (
                        <ToggleOnIcon fontSize="small" color="success" />
                      )}
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {reps.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    Žádní obchodní zástupci.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Upravit zástupce' : 'Nový obchodní zástupce'}</DialogTitle>
        <DialogContent dividers>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField label="Kód" value={form.code} onChange={set('code')} required fullWidth />
            </Grid>
            <Grid item xs={12} sm={8}>
              <TextField
                select
                label="Uživatelský účet"
                value={form.userId}
                onChange={set('userId')}
                required
                fullWidth
              >
                {users.map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.username} — {[u.firstName, u.lastName].filter(Boolean).join(' ')}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Firemní e-mail"
                value={form.businessEmail}
                onChange={set('businessEmail')}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Telefon" value={form.phone} onChange={set('phone')} fullWidth />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Region" value={form.region} onChange={set('region')} fullWidth />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Poznámka"
                value={form.note}
                onChange={set('note')}
                fullWidth
                multiline
                minRows={2}
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

      <Snackbar
        open={!!snack}
        autoHideDuration={4000}
        onClose={() => setSnack('')}
        message={snack}
      />
    </Box>
  );
}
