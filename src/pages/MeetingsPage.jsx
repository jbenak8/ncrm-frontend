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
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import dayjs from 'dayjs';
import client from '../api/client';
import SearchFilterBar from '../components/SearchFilterBar';
import { formatDateTime, MEETING_STATUS_LABELS, STATUS_COLORS } from '../utils/format';

// Fields of the generic meeting search API (filter=field:operator:value).
const SEARCH_FIELDS = [
  { name: 'subject', label: 'Předmět', type: 'text' },
  { name: 'description', label: 'Popis', type: 'text' },
  { name: 'customer.name', label: 'Zákazník', type: 'text' },
  { name: 'plannedDate', label: 'Plánovaný termín', type: 'datetime' },
  {
    name: 'status',
    label: 'Stav',
    type: 'enum',
    options: Object.entries(MEETING_STATUS_LABELS).map(([value, label]) => ({ value, label })),
  },
  { name: 'outcome', label: 'Výsledek', type: 'text' },
];

function MeetingFormDialog({ open, meeting, onClose, onSaved }) {
  const [customers, setCustomers] = useState([]);
  const [reps, setReps] = useState([]);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    setForm({
      customerId: meeting?.customerId || '',
      salesRepresentativeId: meeting?.salesRepresentativeId || '',
      subject: meeting?.subject || '',
      description: meeting?.description || '',
      plannedDate: meeting?.plannedDate
        ? dayjs(meeting.plannedDate).format('YYYY-MM-DDTHH:mm')
        : dayjs().add(1, 'day').hour(9).minute(0).format('YYYY-MM-DDTHH:mm'),
      status: meeting?.status || 'PLANNED',
      outcome: meeting?.outcome || '',
    });
    client
      .get('/customers', { params: { page: 0, size: 1000, sort: 'name,asc' } })
      .then((res) => setCustomers(res.data.content || []))
      .catch(() => setCustomers([]));
    client
      .get('/users/sales-representatives')
      .then((res) => setReps(res.data))
      .catch(() => setReps([]));
  }, [open, meeting]);

  if (!form) return null;

  const handleSave = async () => {
    if (!form.customerId || !form.salesRepresentativeId || !form.subject.trim()) {
      setError('Vyplňte zákazníka, obchodního zástupce a předmět.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        customerId: form.customerId,
        salesRepresentativeId: form.salesRepresentativeId,
        subject: form.subject,
        description: form.description || null,
        plannedDate: new Date(form.plannedDate).toISOString(),
        status: form.status,
        outcome: form.outcome || null,
      };
      const { data } = meeting
        ? await client.put(`/meetings/${meeting.id}`, payload)
        : await client.post('/meetings', payload);
      onSaved(data);
      onClose();
    } catch {
      setError('Uložení schůzky se nezdařilo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{meeting ? 'Upravit schůzku' : 'Nová schůzka'}</DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              select
              label="Zákazník"
              value={form.customerId}
              onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value }))}
              required
              fullWidth
            >
              {customers.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField
              select
              label="Obchodní zástupce"
              value={form.salesRepresentativeId}
              onChange={(e) => setForm((f) => ({ ...f, salesRepresentativeId: e.target.value }))}
              required
              fullWidth
            >
              {reps.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  {r.firstName} {r.lastName}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Předmět"
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              required
              fullWidth
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Plánovaný termín"
              type="datetime-local"
              value={form.plannedDate}
              onChange={(e) => setForm((f) => ({ ...f, plannedDate: e.target.value }))}
              required
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Popis"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              fullWidth
              multiline
              minRows={2}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Zrušit</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? 'Ukládám…' : 'Uložit'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function CompleteDialog({ open, meeting, onClose, onCompleted }) {
  const [outcome, setOutcome] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setOutcome('');
      setError('');
    }
  }, [open]);

  const handleComplete = async () => {
    if (!outcome.trim()) {
      setError('Zadejte výsledek schůzky.');
      return;
    }
    try {
      await client.post(`/meetings/${meeting.id}/complete`, outcome, {
        headers: { 'Content-Type': 'application/json' },
      });
      onCompleted();
      onClose();
    } catch {
      setError('Dokončení schůzky se nezdařilo.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Dokončit schůzku</DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <TextField
          label="Výsledek schůzky"
          value={outcome}
          onChange={(e) => setOutcome(e.target.value)}
          fullWidth
          multiline
          minRows={3}
          autoFocus
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Zrušit</Button>
        <Button variant="contained" onClick={handleComplete}>
          Dokončit
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState([]);
  const [filters, setFilters] = useState([]);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snack, setSnack] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [completing, setCompleting] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', page);
    params.set('size', size);
    params.set('sort', 'plannedDate,desc');
    filters.forEach((f) => params.append('filter', f));
    client
      .get('/meetings/search', { params })
      .then((res) => {
        setMeetings(res.data.content || []);
        setTotal(res.data.totalElements ?? 0);
      })
      .catch(() => setError('Nepodařilo se načíst schůzky.'))
      .finally(() => setLoading(false));
  }, [page, size, filters]);

  useEffect(load, [load]);

  const handleCancel = async (meeting) => {
    if (!window.confirm(`Opravdu zrušit schůzku „${meeting.subject}“?`)) return;
    try {
      await client.post(`/meetings/${meeting.id}/cancel`);
      setSnack('Schůzka byla zrušena.');
      load();
    } catch {
      setError('Zrušení schůzky se nezdařilo.');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          Schůzky
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          Nová schůzka
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
              <TableCell>Termín</TableCell>
              <TableCell>Zákazník</TableCell>
              <TableCell>Předmět</TableCell>
              <TableCell>Zástupce</TableCell>
              <TableCell>Stav</TableCell>
              <TableCell>Výsledek</TableCell>
              <TableCell align="right">Akce</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {meetings.map((m) => (
              <TableRow key={m.id} hover>
                <TableCell>{formatDateTime(m.plannedDate)}</TableCell>
                <TableCell>{m.customerName}</TableCell>
                <TableCell>{m.subject}</TableCell>
                <TableCell>{m.salesRepresentativeName || '—'}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={MEETING_STATUS_LABELS[m.status] || m.status}
                    color={STATUS_COLORS[m.status] || 'default'}
                  />
                </TableCell>
                <TableCell>{m.outcome || '—'}</TableCell>
                <TableCell align="right">
                  {['PLANNED', 'IN_PROGRESS'].includes(m.status) && (
                    <>
                      <Tooltip title="Upravit">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setEditing(m);
                            setFormOpen(true);
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Dokončit">
                        <IconButton size="small" color="success" onClick={() => setCompleting(m)}>
                          <CheckCircleIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Zrušit">
                        <IconButton size="small" color="error" onClick={() => handleCancel(m)}>
                          <CancelIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {meetings.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    Žádné schůzky.
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

      <MeetingFormDialog
        open={formOpen}
        meeting={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setSnack('Schůzka byla uložena.');
          load();
        }}
      />
      <CompleteDialog
        open={!!completing}
        meeting={completing}
        onClose={() => setCompleting(null)}
        onCompleted={() => {
          setSnack('Schůzka byla dokončena.');
          load();
        }}
      />
      <Snackbar
        open={!!snack}
        autoHideDuration={4000}
        onClose={() => setSnack('')}
        message={snack}
      />
    </Box>
  );
}
