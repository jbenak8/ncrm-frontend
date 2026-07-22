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
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import SearchIcon from '@mui/icons-material/Search';
import PrintIcon from '@mui/icons-material/Print';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import dayjs from 'dayjs';
import client from '../api/client';
import { useCompany } from '../company/CompanyContext';
import ItemPickerDialog from '../components/ItemPickerDialog';
import SearchFilterBar from '../components/SearchFilterBar';
import {
  formatDateTime,
  formatMoney,
  INVOICE_PAYMENT_LABELS,
  ORDER_STATUS_LABELS,
  STATUS_COLORS,
} from '../utils/format';

// Fields of the generic order search API (filter=field:operator:value).
const SEARCH_FIELDS = [
  { name: 'orderNumber', label: 'Číslo objednávky', type: 'text' },
  { name: 'customer.name', label: 'Zákazník', type: 'text' },
  { name: 'company.name', label: 'Společnost', type: 'text' },
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

// Order items may be modified only while the order is new or confirmed.
const EDITABLE_STATUSES = ['NEW', 'CONFIRMED'];

const NEXT_STATUSES = {
  NEW: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

function OrderRow({ order, onStatusChange, onEditItems, onPrint, onIssueInvoice }) {
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
        <TableCell>{order.companyName || '—'}</TableCell>
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
          {EDITABLE_STATUSES.includes(order.status) && (
            <Tooltip title="Upravit položky objednávky">
              <IconButton size="small" onClick={() => onEditItems(order)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {order.status === 'COMPLETED' && (
            <Tooltip title="Vystavit fakturu">
              <IconButton size="small" color="primary" onClick={() => onIssueInvoice(order)}>
                <ReceiptLongIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Vytisknout objednávku">
            <IconButton size="small" onClick={() => onPrint(order)}>
              <PrintIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={9} sx={{ py: 0, borderBottom: open ? undefined : 'none' }}>
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

/**
 * Dialog for editing the items of an existing order. It is available only for
 * orders in the NEW or CONFIRMED status; the whole order (with the updated item
 * list) is sent to `PUT /orders/{id}`.
 */
function EditOrderItemsDialog({ order, onClose, onSaved }) {
  const [items, setItems] = useState([]);
  const [rows, setRows] = useState([{ itemId: '', quantity: 1 }]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!order) return;
    setError('');
    setRows(
      (order.items || []).length > 0
        ? order.items.map((i) => ({ itemId: i.itemId || '', quantity: i.quantity }))
        : [{ itemId: '', quantity: 1 }]
    );
    client
      .get('/items')
      .then((res) => setItems(res.data))
      .catch(() => setItems([]));
  }, [order]);

  const setRow = (idx, field, value) =>
    setRows((rs) => rs.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));

  // Adds the items picked in the search dialog as new rows; already present
  // items are skipped and blank rows are dropped.
  const handlePicked = (picked) => {
    setItems((list) => [...list, ...picked.filter((p) => !list.some((i) => i.id === p.id))]);
    setRows((rs) => {
      const kept = rs.filter((r) => r.itemId);
      const added = picked
        .filter((p) => !kept.some((r) => r.itemId === p.id))
        .map((p) => ({ itemId: p.id, quantity: 1 }));
      const next = [...kept, ...added];
      return next.length > 0 ? next : [{ itemId: '', quantity: 1 }];
    });
  };

  const handleSave = async () => {
    const validItems = rows.filter((i) => i.itemId && Number(i.quantity) > 0);
    if (validItems.length === 0) {
      setError('Objednávka musí obsahovat alespoň jednu položku.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      // The backend accepts only a full order update, so the unchanged header
      // fields are sent along with the edited item list.
      const { data } = await client.put(`/orders/${order.id}`, {
        customerId: order.customerId,
        companyId: order.companyId || null,
        contactPersonId: order.contactPersonId || null,
        salesRepresentativeId: order.salesRepresentativeId,
        orderDate: order.orderDate,
        currency: order.currency,
        note: order.note || null,
        items: validItems.map((i) => ({ itemId: i.itemId, quantity: Number(i.quantity) })),
      });
      onSaved(data);
      onClose();
    } catch {
      setError('Uložení položek objednávky se nezdařilo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!order} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Upravit položky objednávky {order?.orderNumber}</DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Grid container spacing={2}>
          {rows.map((row, idx) => (
            <Grid item xs={12} key={idx}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField
                  select
                  label="Položka"
                  value={row.itemId}
                  onChange={(e) => setRow(idx, 'itemId', e.target.value)}
                  sx={{ flexGrow: 1 }}
                  size="small"
                >
                  {items
                    .filter((i) => i.active !== false || i.id === row.itemId)
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
                  onChange={(e) => setRow(idx, 'quantity', e.target.value)}
                  inputProps={{ min: 1 }}
                  sx={{ width: 120 }}
                />
                <IconButton
                  onClick={() => setRows((rs) => rs.filter((_, i) => i !== idx))}
                  disabled={rows.length === 1}
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
              onClick={() => setRows((rs) => [...rs, { itemId: '', quantity: 1 }])}
            >
              Přidat položku
            </Button>
            <Button size="small" startIcon={<SearchIcon />} onClick={() => setPickerOpen(true)}>
              Vyhledat zboží
            </Button>
          </Grid>
        </Grid>
        <ItemPickerDialog
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onAdd={handlePicked}
        />
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

/**
 * Dialog for issuing an invoice for a completed order. The payment type determines
 * the layout of the printed invoice (a bank transfer invoice carries the bank
 * account, variable symbol and a payment QR code); the request is sent to
 * `POST /invoices`.
 */
function IssueInvoiceDialog({ order, onClose, onIssued }) {
  const [form, setForm] = useState({ paymentType: 'TRANSFER', dueDays: 14, note: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!order) return;
    setForm({ paymentType: 'TRANSFER', dueDays: 14, note: '' });
    setError('');
  }, [order]);

  const handleIssue = async () => {
    const dueDays = form.dueDays === '' ? null : Number(form.dueDays);
    if (dueDays !== null && (Number.isNaN(dueDays) || dueDays < 0 || dueDays > 365)) {
      setError('Splatnost musí být v rozsahu 0–365 dnů.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const { data } = await client.post('/invoices', {
        orderId: order.id,
        paymentType: form.paymentType,
        dueDays,
        note: form.note || null,
      });
      onIssued(data);
      onClose();
    } catch (e) {
      setError(
        e.response?.data?.message || 'Vystavení faktury se nezdařilo. Faktura k objednávce již možná existuje.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!order} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Vystavit fakturu k objednávce {order?.orderNumber}</DialogTitle>
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
              label="Způsob platby"
              value={form.paymentType}
              onChange={(e) => setForm((f) => ({ ...f, paymentType: e.target.value }))}
              required
              fullWidth
            >
              {Object.entries(INVOICE_PAYMENT_LABELS).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Splatnost (dny)"
              type="number"
              value={form.dueDays}
              onChange={(e) => setForm((f) => ({ ...f, dueDays: e.target.value }))}
              fullWidth
              inputProps={{ min: 0, max: 365 }}
              helperText="Prázdné = výchozích 14 dnů"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Poznámka na faktuře"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              fullWidth
              multiline
              minRows={2}
              inputProps={{ maxLength: 255 }}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Zrušit</Button>
        <Button variant="contained" onClick={handleIssue} disabled={saving}>
          {saving ? 'Vystavuji…' : 'Vystavit fakturu'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function NewOrderDialog({ open, onClose, onSaved }) {
  const { activeCompany } = useCompany() || {};
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
  const [pickerOpen, setPickerOpen] = useState(false);
  // Customer's most recent order, offered as a template for the item rows.
  const [lastOrder, setLastOrder] = useState(null);

  useEffect(() => {
    if (!open) return;
    setError('');
    setLastOrder(null);
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

  // After a customer is picked, look up their most recent order so its items
  // (including quantities) can be offered as a prefill.
  useEffect(() => {
    setLastOrder(null);
    if (!open || !form.customerId) return;
    const params = new URLSearchParams();
    params.set('page', 0);
    params.set('size', 1);
    params.set('sort', 'orderDate,desc');
    params.append('filter', `customer.id:eq:${form.customerId}`);
    client
      .get('/orders/search', { params })
      .then((res) => {
        const order = (res.data.content || [])[0];
        if (order && (order.items || []).some((i) => i.itemId)) setLastOrder(order);
      })
      .catch(() => setLastOrder(null));
  }, [open, form.customerId]);

  // Replaces the item rows with the items of the customer's last order.
  const handlePrefillFromLastOrder = () => {
    if (!lastOrder) return;
    const rows = (lastOrder.items || [])
      .filter((i) => i.itemId)
      .map((i) => ({ itemId: i.itemId, quantity: i.quantity }));
    if (rows.length > 0) {
      setForm((f) => ({ ...f, items: rows }));
    }
    setLastOrder(null);
  };

  const setItemRow = (idx, field, value) =>
    setForm((f) => ({
      ...f,
      items: f.items.map((row, i) => (i === idx ? { ...row, [field]: value } : row)),
    }));

  // Adds the items picked in the search dialog as new rows; already present
  // items are skipped and blank rows are dropped.
  const handlePicked = (picked) => {
    setItems((list) => [...list, ...picked.filter((p) => !list.some((i) => i.id === p.id))]);
    setForm((f) => {
      const kept = f.items.filter((r) => r.itemId);
      const added = picked
        .filter((p) => !kept.some((r) => r.itemId === p.id))
        .map((p) => ({ itemId: p.id, quantity: 1 }));
      const next = [...kept, ...added];
      return { ...f, items: next.length > 0 ? next : [{ itemId: '', quantity: 1 }] };
    });
  };

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
        // Own company issuing the order; the backend falls back to the default company.
        companyId: activeCompany?.id || null,
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
          {lastOrder && (
            <Grid item xs={12}>
              <Alert
                severity="info"
                onClose={() => setLastOrder(null)}
                action={
                  <Button color="inherit" size="small" onClick={handlePrefillFromLastOrder}>
                    Předvyplnit
                  </Button>
                }
              >
                Zákazník má poslední objednávku {lastOrder.orderNumber} (
                {formatDateTime(lastOrder.orderDate)}) — chcete převzít její položky včetně
                množství?
              </Alert>
            </Grid>
          )}
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
                    .filter((i) => i.active !== false || i.id === row.itemId)
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
            <Button size="small" startIcon={<SearchIcon />} onClick={() => setPickerOpen(true)}>
              Vyhledat zboží
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
        <ItemPickerDialog
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onAdd={handlePicked}
        />
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
  const { activeCompany } = useCompany() || {};
  const [orders, setOrders] = useState([]);
  const [filters, setFilters] = useState([]);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snack, setSnack] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [invoicingOrder, setInvoicingOrder] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', page);
    params.set('size', size);
    params.set('sort', 'orderDate,desc');
    // The list is scoped to the currently selected own company.
    if (activeCompany) params.append('filter', `company.id:eq:${activeCompany.id}`);
    filters.forEach((f) => params.append('filter', f));
    client
      .get('/orders/search', { params })
      .then((res) => {
        setOrders(res.data.content || []);
        setTotal(res.data.totalElements ?? 0);
      })
      .catch(() => setError('Nepodařilo se načíst objednávky.'))
      .finally(() => setLoading(false));
  }, [page, size, filters, activeCompany]);

  useEffect(load, [load]);

  // Downloads the printable PDF of the order from the reporting API.
  const handlePrint = async (order) => {
    try {
      const res = await client.get(`/reports/order/${order.id}/print`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `objednavka-${order.orderNumber}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Tisk objednávky se nezdařil.');
    }
  };

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
              <TableCell>Společnost</TableCell>
              <TableCell>Zástupce</TableCell>
              <TableCell>Datum</TableCell>
              <TableCell align="right">Cena</TableCell>
              <TableCell>Stav</TableCell>
              <TableCell align="right">Změna stavu</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.map((o) => (
              <OrderRow
                key={o.id}
                order={o}
                onStatusChange={handleStatusChange}
                onEditItems={setEditingOrder}
                onPrint={handlePrint}
                onIssueInvoice={setInvoicingOrder}
              />
            ))}
            {orders.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={9} align="center">
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

      <EditOrderItemsDialog
        order={editingOrder}
        onClose={() => setEditingOrder(null)}
        onSaved={() => {
          setSnack('Položky objednávky byly upraveny.');
          load();
        }}
      />
      <IssueInvoiceDialog
        order={invoicingOrder}
        onClose={() => setInvoicingOrder(null)}
        onIssued={(invoice) => {
          setSnack(`Faktura ${invoice.invoiceNumber} byla vystavena.`);
        }}
      />
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
