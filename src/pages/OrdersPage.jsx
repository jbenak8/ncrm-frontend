import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
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
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import dayjs from 'dayjs';
import client from '../api/client';
import SearchFilterBar from '../components/SearchFilterBar';
import { formatDateTime, formatMoney, ORDER_STATUS_LABELS, STATUS_COLORS } from '../utils/format';

// Fields of the generic order search API (filter=field:operator:value).
const SEARCH_FIELDS = [
  { name: 'orderNumber', label: 'Číslo objednávky', type: 'text' },
  { name: 'customer.name', label: 'Zákazník', type: 'text' },
  { name: 'orderDate', label: 'Datum', type: 'date' },
  { name: 'totalPrice', label: 'Cena', type: 'number' },
  { name: 'currency', label: 'Měna', type: 'text' },
  {
    name: 'status',
    label: 'Stav',
    type: 'enum',
    options: Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => ({ value, label })),
  },
  { name: 'note', label: 'Poznámka', type: 'text' },
];

const NEXT_STATUSES = {
  NEW: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

function OrderRow({ order, onStatusChange }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TableRow hover>
        <TableCell padding="checkbox">
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell>{order.orderNumber}</TableCell>
        <TableCell>{order.customerName}</TableCell>
        <TableCell>{order.salesRepresentativeName || '—'}</TableCell>
        <TableCell>{formatDateTime(order.orderDate)}</TableCell>
        <TableCell align="right">{formatMoney(order.totalPrice, order.currency)}</TableCell>
        <TableCell>
          <Chip
            size="small"
            label={ORDER_STATUS_LABELS[order.status] || order.status}
            color={STATUS_COLORS[order.status] || 'default'}
          />
        </TableCell>
        <TableCell align="right">
          {(NEXT_STATUSES[order.status] || []).map((s) => (
            <Button
              key={s}
              size="small"
              color={s === 'CANCELLED' ? 'error' : 'primary'}
              onClick={() => onStatusChange(order, s)}
            >
              {ORDER_STATUS_LABELS[s]}
            </Button>
          ))}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={8} sx={{ py: 0, borderBottom: open ? undefined : 'none' }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ my: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Položky objednávky
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Kód</TableCell>
                    <TableCell>Název</TableCell>
                    <TableCell align="right">Množství</TableCell>
                    <TableCell align="right">Cena/ks</TableCell>
                    <TableCell align="right">Celkem</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(order.items || []).map((i) => (
                    <TableRow key={i.id}>
                      <TableCell>{i.itemCode}</TableCell>
                      <TableCell>{i.itemName}</TableCell>
                      <TableCell align="right">{i.quantity}</TableCell>
                      <TableCell align="right">{formatMoney(i.unitPrice, order.currency)}</TableCell>
                      <TableCell align="right">{formatMoney(i.totalPrice, order.currency)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {order.note && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Poznámka: {order.note}
                </Typography>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

function NewOrderDialog({ open, onClose, onSaved }) {
  const [customers, setCustomers] = useState([]);
  const [reps, setReps] = useState([]);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({
    customerId: '',
    salesRepresentativeId: '',
    orderDate: dayjs().format('YYYY-MM-DDTHH:mm'),
    currency: 'CZK',
    note: '',
    items: [{ itemId: '', quantity: 1 }],
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    setForm({
      customerId: '',
      salesRepresentativeId: '',
      orderDate: dayjs().format('YYYY-MM-DDTHH:mm'),
      currency: 'CZK',
      note: '',
      items: [{ itemId: '', quantity: 1 }],
    });
    client
      .get('/customers', { params: { page: 0, size: 1000, sort: 'name,asc' } })
      .then((res) => setCustomers(res.data.content || []))
      .catch(() => setCustomers([]));
    client
      .get('/users/sales-representatives')
      .then((res) => setReps(res.data))
      .catch(() => setReps([]));
    client
      .get('/items')
      .then((res) => setItems(res.data))
      .catch(() => setItems([]));
  }, [open]);

  const setItemRow = (idx, field, value) =>
    setForm((f) => ({
      ...f,
      items: f.items.map((row, i) => (i === idx ? { ...row, [field]: value } : row)),
    }));

  const handleSave = async () => {
    const validItems = form.items.filter((i) => i.itemId && Number(i.quantity) > 0);
    if (!form.customerId || !form.salesRepresentativeId || validItems.length === 0) {
      setError('Vyplňte zákazníka, obchodního zástupce a alespoň jednu položku.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const { data } = await client.post('/orders', {
        customerId: form.customerId,
        salesRepresentativeId: form.salesRepresentativeId,
        orderDate: new Date(form.orderDate).toISOString(),
        currency: form.currency,
        note: form.note || null,
        items: validItems.map((i) => ({ itemId: i.itemId, quantity: Number(i.quantity) })),
      });
      onSaved(data);
      onClose();
    } catch {
      setError('Vytvoření objednávky se nezdařilo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Nová objednávka</DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
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
          <Grid item xs={12} sm={6}>
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
          <Grid item xs={12} sm={6}>
            <TextField
              label="Datum objednávky"
              type="datetime-local"
              value={form.orderDate}
              onChange={(e) => setForm((f) => ({ ...f, orderDate: e.target.value }))}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              label="Měna"
              value={form.currency}
              onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
              fullWidth
            >
              {['CZK', 'EUR', 'USD'].map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2">Položky</Typography>
          </Grid>
          {form.items.map((row, idx) => (
            <Grid item xs={12} key={idx}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField
                  select
                  label="Položka"
                  value={row.itemId}
                  onChange={(e) => setItemRow(idx, 'itemId', e.target.value)}
                  sx={{ flexGrow: 1 }}
                  size="small"
                >
                  {items
                    .filter((i) => i.active !== false)
                    .map((i) => (
                      <MenuItem key={i.id} value={i.id}>
                        {i.code} — {i.name}{' '}
                        {i.price ? `(${formatMoney(i.price.price, i.price.currency)})` : ''}
                      </MenuItem>
                    ))}
                </TextField>
                <TextField
                  label="Množství"
                  type="number"
                  size="small"
                  value={row.quantity}
                  onChange={(e) => setItemRow(idx, 'quantity', e.target.value)}
                  inputProps={{ min: 1 }}
                  sx={{ width: 120 }}
                />
                <IconButton
                  onClick={() =>
                    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))
                  }
                  disabled={form.items.length === 1}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            </Grid>
          ))}
          <Grid item xs={12}>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() =>
                setForm((f) => ({ ...f, items: [...f.items, { itemId: '', quantity: 1 }] }))
              }
            >
              Přidat položku
            </Button>
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Poznámka"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
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
          {saving ? 'Ukládám…' : 'Vytvořit'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [filters, setFilters] = useState([]);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snack, setSnack] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', page);
    params.set('size', size);
    params.set('sort', 'orderDate,desc');
    filters.forEach((f) => params.append('filter', f));
    client
      .get('/orders/search', { params })
      .then((res) => {
        setOrders(res.data.content || []);
        setTotal(res.data.totalElements ?? 0);
      })
      .catch(() => setError('Nepodařilo se načíst objednávky.'))
      .finally(() => setLoading(false));
  }, [page, size, filters]);

  useEffect(load, [load]);

  const handleStatusChange = async (order, status) => {
    try {
      await client.post(`/orders/${order.id}/status/${status}`);
      setSnack(`Objednávka ${order.orderNumber} má nový stav: ${ORDER_STATUS_LABELS[status]}.`);
      load();
    } catch {
      setError('Změna stavu se nezdařila.');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          Objednávky
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Nová objednávka
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
              <TableCell />
              <TableCell>Číslo</TableCell>
              <TableCell>Zákazník</TableCell>
              <TableCell>Zástupce</TableCell>
              <TableCell>Datum</TableCell>
              <TableCell align="right">Cena</TableCell>
              <TableCell>Stav</TableCell>
              <TableCell align="right">Změna stavu</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.map((o) => (
              <OrderRow key={o.id} order={o} onStatusChange={handleStatusChange} />
            ))}
            {orders.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    Žádné objednávky.
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

      <NewOrderDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={() => {
          setSnack('Objednávka byla vytvořena.');
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
