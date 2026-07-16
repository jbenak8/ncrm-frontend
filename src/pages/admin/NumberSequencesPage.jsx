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
import client from '../../api/client';
import { NUMBER_SEQUENCE_TYPE_LABELS } from '../../utils/format';

const emptyForm = {
  type: 'ORDER',
  prefix: '',
  includeYear: true,
  padding: 6,
  nextValue: 1,
  yearlyReset: true,
  description: '',
};

/**
 * Administration of number sequences (owner only): definitions used to generate
 * order and invoice numbers (prefix, year part, zero-padded counter, yearly reset).
 */
export default function NumberSequencesPage() {
  const [sequences, setSequences] = useState([]);
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
      .get('/number-sequences')
      .then((res) => setSequences(res.data))
      .catch(() => setError('Nepodařilo se načíst číselné řady.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const openForm = (sequence) => {
    setEditing(sequence || null);
    setForm(
      sequence
        ? {
            type: sequence.type,
            prefix: sequence.prefix || '',
            includeYear: sequence.includeYear,
            padding: sequence.padding,
            nextValue: sequence.nextValue,
            yearlyReset: sequence.yearlyReset,
            description: sequence.description || '',
          }
        : emptyForm
    );
    setFormError('');
    setFormOpen(true);
  };

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const setChecked = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.checked }));

  // Preview of the next generated number, mirroring the backend generator
  // (prefix + optional year + zero-padded counter).
  const preview = () => {
    const year = form.includeYear ? String(new Date().getFullYear()) : '';
    const counter = String(Math.max(1, Number(form.nextValue) || 1)).padStart(
      Math.min(12, Math.max(1, Number(form.padding) || 1)),
      '0'
    );
    return `${form.prefix || ''}${year ? `${year}-` : ''}${counter}`;
  };

  const handleSave = async () => {
    const padding = Number(form.padding);
    const nextValue = Number(form.nextValue);
    if (!form.type || !padding || padding < 1 || padding > 12 || !nextValue || nextValue < 1) {
      setFormError('Typ, počet číslic (1–12) a další hodnota (min. 1) jsou povinné.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        type: form.type,
        prefix: form.prefix || null,
        includeYear: form.includeYear,
        padding,
        nextValue,
        yearlyReset: form.yearlyReset,
        description: form.description || null,
      };
      if (editing) {
        await client.put(`/number-sequences/${editing.id}`, payload);
      } else {
        await client.post('/number-sequences', payload);
      }
      setSnack('Číselná řada byla uložena.');
      setFormOpen(false);
      load();
    } catch {
      setFormError('Uložení číselné řady se nezdařilo. Pro každý typ dokladu může existovat jen jedna řada.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await client.delete(`/number-sequences/${deleting.id}`);
      setSnack('Číselná řada byla smazána.');
      load();
    } catch {
      setError('Smazání číselné řady se nezdařilo.');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          Číselné řady
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => openForm(null)}>
          Nová řada
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
              <TableCell>Typ dokladu</TableCell>
              <TableCell>Prefix</TableCell>
              <TableCell>Rok v čísle</TableCell>
              <TableCell align="right">Počet číslic</TableCell>
              <TableCell align="right">Další hodnota</TableCell>
              <TableCell>Roční reset</TableCell>
              <TableCell>Příští číslo</TableCell>
              <TableCell>Popis</TableCell>
              <TableCell align="right">Akce</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sequences.map((s) => (
              <TableRow key={s.id} hover>
                <TableCell>
                  <Chip
                    size="small"
                    label={NUMBER_SEQUENCE_TYPE_LABELS[s.type] || s.type}
                    color={s.type === 'INVOICE' ? 'primary' : 'default'}
                  />
                </TableCell>
                <TableCell>{s.prefix || '—'}</TableCell>
                <TableCell>{s.includeYear ? 'Ano' : 'Ne'}</TableCell>
                <TableCell align="right">{s.padding}</TableCell>
                <TableCell align="right">{s.nextValue}</TableCell>
                <TableCell>{s.yearlyReset ? 'Ano' : 'Ne'}</TableCell>
                <TableCell>
                  <Typography variant="body2" fontFamily="monospace">
                    {s.nextNumberPreview}
                  </Typography>
                </TableCell>
                <TableCell>{s.description || '—'}</TableCell>
                <TableCell align="right">
                  <Tooltip title="Upravit">
                    <IconButton size="small" onClick={() => openForm(s)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Smazat">
                    <IconButton size="small" onClick={() => setDeleting(s)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {sequences.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    Žádné číselné řady. Bez definované řady se čísla dokladů generují výchozím způsobem.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Upravit číselnou řadu' : 'Nová číselná řada'}</DialogTitle>
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
                label="Typ dokladu"
                value={form.type}
                onChange={set('type')}
                required
                fullWidth
                disabled={!!editing}
              >
                {Object.entries(NUMBER_SEQUENCE_TYPE_LABELS).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Prefix"
                value={form.prefix}
                onChange={set('prefix')}
                fullWidth
                inputProps={{ maxLength: 20 }}
                helperText="Např. OBJ- nebo FA-"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Počet číslic"
                type="number"
                value={form.padding}
                onChange={set('padding')}
                required
                fullWidth
                inputProps={{ min: 1, max: 12 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Další hodnota"
                type="number"
                value={form.nextValue}
                onChange={set('nextValue')}
                required
                fullWidth
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={<Checkbox checked={form.includeYear} onChange={setChecked('includeYear')} />}
                label="Zahrnout rok do čísla"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={<Checkbox checked={form.yearlyReset} onChange={setChecked('yearlyReset')} />}
                label="Resetovat čítač na začátku roku"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Popis"
                value={form.description}
                onChange={set('description')}
                fullWidth
                inputProps={{ maxLength: 255 }}
              />
            </Grid>
            <Grid item xs={12}>
              <Alert severity="info">
                Příští vygenerované číslo: <strong>{preview()}</strong>
              </Alert>
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
        <DialogTitle>Smazat číselnou řadu?</DialogTitle>
        <DialogContent>
          <Typography>
            Opravdu chcete smazat číselnou řadu pro doklady typu{' '}
            {deleting ? NUMBER_SEQUENCE_TYPE_LABELS[deleting.type] || deleting.type : ''}?
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
