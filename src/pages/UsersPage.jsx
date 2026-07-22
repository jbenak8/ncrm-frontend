import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  LinearProgress,
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
  TablePagination,
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
import { useCompany } from '../company/CompanyContext';
import SearchFilterBar from '../components/SearchFilterBar';
import { formatDateTime } from '../utils/format';
import { isPasswordValid, PASSWORD_POLICY_DESCRIPTION } from '../utils/password';

const ROLE_LABELS = {
  ADMIN: 'Administrátor',
  OWNER: 'Majitel',
  SALES_REPRESENTATIVE: 'Obchodní zástupce',
  CUSTOMER: 'Zákazník',
};

// Fields of the generic user search API (filter=field:operator:value).
const SEARCH_FIELDS = [
  { name: 'username', label: 'Uživatelské jméno', type: 'text' },
  { name: 'email', label: 'E-mail', type: 'text' },
  { name: 'firstName', label: 'Jméno', type: 'text' },
  { name: 'lastName', label: 'Příjmení', type: 'text' },
  { name: 'enabled', label: 'Povolený', type: 'boolean' },
  { name: 'locked', label: 'Zamknutý', type: 'boolean' },
  { name: 'lastLoginAt', label: 'Poslední přihlášení', type: 'datetime' },
];

const emptyForm = {
  username: '',
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  enabled: true,
  locked: false,
  mustChangePassword: true,
  sendCredentials: false,
  roles: ['CUSTOMER'],
  companyIds: [],
  customerId: '',
};

export default function UsersPage() {
  const { companies } = useCompany();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [filters, setFilters] = useState([]);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snack, setSnack] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', page);
    params.set('size', size);
    params.set('sort', 'username,asc');
    filters.forEach((f) => params.append('filter', f));
    client
      .get('/users/search', { params })
      .then((res) => {
        setUsers(res.data.content || []);
        setTotal(res.data.totalElements ?? 0);
      })
      .catch(() => setError('Nepodařilo se načíst uživatele.'))
      .finally(() => setLoading(false));
  }, [page, size, filters]);

  useEffect(load, [load]);

  // Assignable roles are loaded from the API.
  useEffect(() => {
    client
      .get('/roles')
      .then((res) => setRoles(res.data))
      .catch(() =>
        setRoles(Object.keys(ROLE_LABELS).map((name) => ({ id: name, name, description: null })))
      );
  }, []);

  // Customers for assigning a CUSTOMER-only user to a customer.
  useEffect(() => {
    client
      .get('/customers', { params: { page: 0, size: 1000, sort: 'name,asc' } })
      .then((res) => setCustomers(res.data.content || []))
      .catch(() => setCustomers([]));
  }, []);

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
            mustChangePassword: !!user.mustChangePassword,
            sendCredentials: false,
            roles: user.roles && user.roles.length > 0 ? user.roles : ['CUSTOMER'],
            companyIds: user.companyIds || [],
            customerId: user.customerId || '',
          }
        : emptyForm
    );
    setFormError('');
    setFormOpen(true);
  };

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  // Human-readable names of assigned companies / customer for the table.
  const companyNames = (u) =>
    (u.companyIds || [])
      .map((id) => companies.find((c) => c.id === id)?.name || id)
      .join(', ');

  const customerName = (u) =>
    u.customerId ? customers.find((c) => c.id === u.customerId)?.name || u.customerId : '';

  // The customer assignment applies only to users whose sole role is CUSTOMER.
  const isCustomerOnly = form.roles.length === 1 && form.roles[0] === 'CUSTOMER';

  const handleSave = async () => {
    if (!form.username.trim() || !form.email.trim() || !form.firstName.trim() || !form.lastName.trim()) {
      setFormError('Uživatelské jméno, e-mail, jméno a příjmení jsou povinné.');
      return;
    }
    if (!editing && !form.password) {
      setFormError('Heslo je při vytváření uživatele povinné.');
      return;
    }
    if (form.password && !isPasswordValid(form.password)) {
      setFormError(PASSWORD_POLICY_DESCRIPTION);
      return;
    }
    if (isCustomerOnly && !form.customerId) {
      setFormError('Vyberte zákazníka, ke kterému bude uživatel přiřazen.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        ...form,
        password: form.password || null,
        customerId: isCustomerOnly ? form.customerId : null,
      };
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

      <SearchFilterBar
        fields={SEARCH_FIELDS}
        filters={filters}
        onChange={(next) => {
          setFilters(next);
          setPage(0);
        }}
      />

      <TableContainer component={Paper}>
        {loading && <LinearProgress />}
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Uživatelské jméno</TableCell>
              <TableCell>Jméno</TableCell>
              <TableCell>E-mail</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Společnosti</TableCell>
              <TableCell>Zákazník</TableCell>
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
                <TableCell>{companyNames(u) || '—'}</TableCell>
                <TableCell>{customerName(u) || '—'}</TableCell>
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
            {users.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    Žádní uživatelé.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={size}
          onRowsPerPageChange={(e) => {
            setSize(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50]}
          labelRowsPerPage="Řádků na stránku:"
        />
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
                error={!!form.password && !isPasswordValid(form.password)}
                helperText={PASSWORD_POLICY_DESCRIPTION}
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
                {roles.map((r) => (
                  <MenuItem key={r.name} value={r.name}>
                    {ROLE_LABELS[r.name] || r.description || r.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            {isCustomerOnly && (
              <Grid item xs={12}>
                <TextField
                  select
                  label="Zákazník"
                  value={form.customerId}
                  onChange={set('customerId')}
                  required
                  fullWidth
                  helperText="Zákazník, ke kterému bude uživatel přiřazen."
                >
                  {customers.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            )}
            <Grid item xs={12}>
              <TextField
                select
                label="Přiřazené společnosti"
                value={form.companyIds}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    companyIds:
                      typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value,
                  }))
                }
                SelectProps={{ multiple: true }}
                fullWidth
                helperText="Bez přiřazení vidí uživatel data všech společností."
              >
                {companies.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
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
              <FormControlLabel
                control={
                  <Switch
                    checked={form.mustChangePassword}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, mustChangePassword: e.target.checked }))
                    }
                  />
                }
                label="Vyžadovat změnu hesla"
              />
            </Grid>
            {!editing && (
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={form.sendCredentials}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, sendCredentials: e.target.checked }))
                      }
                    />
                  }
                  label="Zaslat iniciální přihlašovací údaje uživateli e-mailem"
                />
              </Grid>
            )}
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
