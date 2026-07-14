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
import DeleteIcon from '@mui/icons-material/Delete';
import dayjs from 'dayjs';
import client from '../../api/client';
import { formatDate } from '../../utils/format';

const VAT_TYPE_LABELS = {
  BASE: 'Základní',
  REDUCED_1: 'Snížená 1',
  REDUCED_2: 'Snížená 2',
  REDUCED_3: 'Snížená 3',
  ZERO: 'Nulová',
};

const emptyForm = {
  countryIsoCode: 'CZ',
  type: 'BASE',
  rate: '',
  validFrom: dayjs().format('YYYY-MM-DD'),
  validTo: '',
};

/**
 * Administration of VAT rates (owner only): create, edit and delete rates per country and type.
 */
export default function VatRatesPage() {
  const [rates, setRates] = useState([]);
  const [countries, setCountries] = useState([]);
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
    client
      .get('/vat-rates')
      .then((res) => setRates(res.data))
      .catch(() => setError('Nepodařilo se načíst sazby DPH.'))
      .finally(() => setLoading(false));
    client
      .get('/countries')
      .then((res) => setCountries(res.data))
      .catch(() => setCountries([]));
  }, []);

  useEffect(load, [load]);

  const openForm = (rate) => {
    setEditing(rate || null);
    setForm(
      rate
        ? {
            countryIsoCode: rate.countryIsoCode || 'CZ',
            type: rate.type || 'BASE',
            rate: rate.rate ?? '',
            validFrom: rate.validFrom ? dayjs(rate.validFrom).format('YYYY-MM-DD') : '',
            validTo: rate.validTo ? dayjs(rate.validTo).format('YYYY-MM-DD') : '',
          }
        : emptyForm
    );
    setFormError('');
    setFormOpen(true);
  };

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSave = async () => {
    if (!form.countryIsoCode || !form.type || form.rate === '' || !form.validFrom) {
      setFormError('Země, typ, sazba a platnost od jsou povinné.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        countryIsoCode: form.countryIsoCode,
        type: form.type,
        rate: Number(form.rate),
        validFrom: dayjs(form.validFrom).startOf('day').toISOString(),
        validTo: form.validTo ? dayjs(form.validTo).endOf('day').toISOString() : null,
      };
      if (editing) {
        await client.put(`/vat-rates/${editing.id}`, payload);
      } else {
        await client.post('/vat-rates', payload);
      }
      setSnack('Sazba DPH byla uložena.');
      setFormOpen(false);
      load();
    } catch {
      setFormError('Uložení sazby DPH se nezdařilo.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await client.delete(`/vat-rates/${deleting.id}`);
      setSnack('Sazba DPH byla smazána.');
      load();
    } catch {
      setError('Smazání sazby DPH se nezdařilo.');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          Sazby DPH
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => openForm(null)}>
          Nová sazba
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
              <TableCell>Země</TableCell>
              <TableCell>Typ</TableCell>
              <TableCell align="right">Sazba (%)</TableCell>
              <TableCell>Platnost od</TableCell>
              <TableCell>Platnost do</TableCell>
              <TableCell align="right">Akce</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rates.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell>
                  {r.countryName || r.countryIsoCode}{' '}
                  <Chip size="small" label={r.countryIsoCode} sx={{ ml: 0.5 }} />
                </TableCell>
                <TableCell>{VAT_TYPE_LABELS[r.type] || r.type}</TableCell>
                <TableCell align="right">{r.rate}</TableCell>
                <TableCell>{formatDate(r.validFrom)}</TableCell>
                <TableCell>{formatDate(r.validTo)}</TableCell>
                <TableCell align="right">
                  <Tooltip title="Upravit">
                    <IconButton size="small" onClick={() => openForm(r)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Smazat">
                    <IconButton size="small" onClick={() => setDeleting(r)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {rates.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    Žádné sazby DPH.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Upravit sazbu DPH' : 'Nová sazba DPH'}</DialogTitle>
        <DialogContent dividers>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Země"
                value={form.countryIsoCode}
                onChange={set('countryIsoCode')}
                required
                fullWidth
              >
                {countries.map((c) => (
                  <MenuItem key={c.isoCode} value={c.isoCode}>
                    {c.name} ({c.isoCode})
                  </MenuItem>
                ))}
                {countries.length === 0 && (
                  <MenuItem value={form.countryIsoCode}>{form.countryIsoCode}</MenuItem>
                )}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField select label="Typ" value={form.type} onChange={set('type')} required fullWidth>
                {Object.entries(VAT_TYPE_LABELS).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Sazba (%)"
                type="number"
                value={form.rate}
                onChange={set('rate')}
                required
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Platnost od"
                type="date"
                value={form.validFrom}
                onChange={set('validFrom')}
                required
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Platnost do"
                type="date"
                value={form.validTo}
                onChange={set('validTo')}
                fullWidth
                InputLabelProps={{ shrink: true }}
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
        <DialogTitle>Smazat sazbu DPH?</DialogTitle>
        <DialogContent>
          <Typography>
            Opravdu chcete smazat sazbu {deleting ? VAT_TYPE_LABELS[deleting.type] || deleting.type : ''}{' '}
            {deleting?.rate} % pro zemi {deleting?.countryName || deleting?.countryIsoCode}?
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
