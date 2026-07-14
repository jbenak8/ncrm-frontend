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
  LinearProgress,
  Paper,
  Snackbar,
  Switch,
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
  isoCode: '',
  name: '',
  nameEn: '',
  nameLocal: '',
  active: true,
  euMember: false,
  embargoed: false,
  vatShortCode: '',
  dialingCode: '',
};

/**
 * Administration of the country codebook (owner only): create, edit and (de)activate countries.
 */
export default function CountriesPage() {
  const [countries, setCountries] = useState([]);
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
      .get('/countries')
      .then((res) => setCountries(res.data))
      .catch(() => setError('Nepodařilo se načíst země.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const openForm = (country) => {
    setEditing(country || null);
    setForm(country ? { ...emptyForm, ...country } : emptyForm);
    setFormError('');
    setFormOpen(true);
  };

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const setBool = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.checked }));

  const handleSave = async () => {
    if (!form.isoCode.trim() || !form.name.trim() || !form.nameEn.trim() || !form.dialingCode.trim()) {
      setFormError('ISO kód, název, anglický název a předvolba jsou povinné.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload = { ...form, isoCode: form.isoCode.trim().toUpperCase() };
      if (editing) {
        await client.put(`/countries/${editing.isoCode}`, payload);
      } else {
        await client.post('/countries', payload);
      }
      setSnack('Země byla uložena.');
      setFormOpen(false);
      load();
    } catch {
      setFormError('Uložení země se nezdařilo.');
    } finally {
      setSaving(false);
    }
  };

  const setActive = async (country, active) => {
    try {
      await client.post(`/countries/${country.isoCode}/active/${active}`);
      setSnack(active ? 'Země byla aktivována.' : 'Země byla deaktivována.');
      load();
    } catch {
      setError('Změna stavu země se nezdařila.');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          Země
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => openForm(null)}>
          Nová země
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
              <TableCell>ISO</TableCell>
              <TableCell>Název</TableCell>
              <TableCell>Název (EN)</TableCell>
              <TableCell>Předvolba</TableCell>
              <TableCell>DPH kód</TableCell>
              <TableCell>EU</TableCell>
              <TableCell>Embargo</TableCell>
              <TableCell>Stav</TableCell>
              <TableCell align="right">Akce</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {countries.map((c) => (
              <TableRow key={c.isoCode} hover>
                <TableCell>{c.isoCode}</TableCell>
                <TableCell>{c.name}</TableCell>
                <TableCell>{c.nameEn || '—'}</TableCell>
                <TableCell>{c.dialingCode || '—'}</TableCell>
                <TableCell>{c.vatShortCode || '—'}</TableCell>
                <TableCell>{c.euMember ? 'Ano' : 'Ne'}</TableCell>
                <TableCell>
                  {c.embargoed ? <Chip size="small" color="error" label="Embargo" /> : 'Ne'}
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={c.active !== false ? 'Aktivní' : 'Neaktivní'}
                    color={c.active !== false ? 'success' : 'default'}
                  />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Upravit">
                    <IconButton size="small" onClick={() => openForm(c)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={c.active !== false ? 'Deaktivovat' : 'Aktivovat'}>
                    <IconButton size="small" onClick={() => setActive(c, c.active === false)}>
                      {c.active !== false ? (
                        <ToggleOffIcon fontSize="small" />
                      ) : (
                        <ToggleOnIcon fontSize="small" color="success" />
                      )}
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {countries.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    Žádné země.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Upravit zemi' : 'Nová země'}</DialogTitle>
        <DialogContent dividers>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField
                label="ISO kód"
                value={form.isoCode}
                onChange={set('isoCode')}
                required
                fullWidth
                disabled={!!editing}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Předvolba"
                value={form.dialingCode}
                onChange={set('dialingCode')}
                required
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="DPH kód"
                value={form.vatShortCode}
                onChange={set('vatShortCode')}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Název" value={form.name} onChange={set('name')} required fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Název (EN)"
                value={form.nameEn}
                onChange={set('nameEn')}
                required
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Název (místní)"
                value={form.nameLocal}
                onChange={set('nameLocal')}
                fullWidth
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={<Switch checked={form.active} onChange={setBool('active')} />}
                label="Aktivní"
              />
              <FormControlLabel
                control={<Switch checked={form.euMember} onChange={setBool('euMember')} />}
                label="Člen EU"
              />
              <FormControlLabel
                control={<Switch checked={form.embargoed} onChange={setBool('embargoed')} />}
                label="Embargo"
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
