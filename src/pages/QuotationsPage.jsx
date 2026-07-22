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
import EmailIcon from '@mui/icons-material/Email';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import SearchIcon from '@mui/icons-material/Search';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import dayjs from 'dayjs';
import client from '../api/client';
import { useCompany } from '../company/CompanyContext';
import ItemPickerDialog from '../components/ItemPickerDialog';
import SearchFilterBar from '../components/SearchFilterBar';
import {
  formatDate,
  formatMoney,
  QUOTATION_STATUS_LABELS,
  STATUS_COLORS,
} from '../utils/format';

// Fields of the generic quotation search API (filter=field:operator:value).
const SEARCH_FIELDS = [
  { name: 'quotationNumber', label: 'Číslo nabídky', type: 'text' },
  { name: 'customer.name', label: 'Zákazník', type: 'text' },
  { name: 'company.name', label: 'Společnost', type: 'text' },
  { name: 'quotationDate', label: 'Datum', type: 'date' },
  { name: 'validUntil', label: 'Platnost do', type: 'date' },
  { name: 'totalPrice', label: 'Cena', type: 'number' },
  { name: 'currency', label: 'Měna', type: 'text' },
  {
    name: 'status',
    label: 'Stav',
    type: 'enum',
    options: Object.entries(QUOTATION_STATUS_LABELS).map(([value, label]) => ({ value, label })),
  },
  { name: 'note', label: 'Poznámka', type: 'text' },
];

// Once an order is created from the quotation, it is IN_PROGRESS and read-only.
const READ_ONLY_STATUS = 'IN_PROGRESS';

// Statuses from which an order can still be created.
const CONVERTIBLE_STATUSES = ['NEW', 'SENT', 'ACCEPTED'];

// Manual status transitions offered in the list.
const NEXT_STATUSES = {
  NEW: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
  SENT: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
  ACCEPTED: ['CANCELLED'],
  REJECTED: [],
  IN_PROGRESS: [],
  CANCELLED: [],
};

function QuotationRow({ quotation, onStatusChange, onEdit, onSendEmail, onCreateOrder }) {
  const [open, setOpen] = useState(false);
  const editable = quotation.status !== READ_ONLY_STATUS;
  return (
    <>
      <TableRow hover>
        <TableCell padding="checkbox">
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell>{quotation.quotationNumber}</TableCell>
        <TableCell>{quotation.customerName}</TableCell>
        <TableCell>{quotation.companyName || '—'}</TableCell>
        <TableCell>{quotation.salesRepresentativeName || '—'}</TableCell>
        <TableCell>{formatDate(quotation.quotationDate)}</TableCell>
        <TableCell>{formatDate(quotation.validUntil)}</TableCell>
        <TableCell align="right">{formatMoney(quotation.totalPrice, quotation.currency)}</TableCell>
        <TableCell>
          <Chip
            size="small"
            label={QUOTATION_STATUS_LABELS[quotation.status] || quotation.status}
            color={STATUS_COLORS[quotation.status] || 'default'}
          />
        </TableCell>
        <TableCell align="right">
          {(NEXT_STATUSES[quotation.status] || []).map((s) => (
            <Button
              key={s}
              size="small"
              color={s === 'CANCELLED' || s === 'REJECTED' ? 'error' : 'primary'}
              onClick={() => onStatusChange(quotation, s)}
            >
              {QUOTATION_STATUS_LABELS[s]}
            </Button>
          ))}
          {editable && (
            <Tooltip title="Upravit nabídku">
              <IconButton size="small" onClick={() => onEdit(quotation)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {editable && (
            <Tooltip title="Odeslat zákazníkovi e-mailem">
              <IconButton size="small" color="primary" onClick={() => onSendEmail(quotation)}>
                <EmailIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {CONVERTIBLE_STATUSES.includes(quotation.status) && !quotation.orderId && (
            <Tooltip title="Vytvořit objednávku z nabídky">
              <IconButton size="small" color="primary" onClick={() => onCreateOrder(quotation)}>
                <ShoppingCartIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={10} sx={{ py: 0, borderBottom: open ? undefined : 'none' }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ my: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Položky nabídky
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
                  {(quotation.items || []).map((i) => (
                    <TableRow key={i.id}>
                      <TableCell>{i.itemCode}</TableCell>
                      <TableCell>{i.itemName}</TableCell>
                      <TableCell align="right">{i.quantity}</TableCell>
                      <TableCell align="right">{formatMoney(i.unitPrice, quotation.currency)}</TableCell>
                      <TableCell align="right">{formatMoney(i.totalPrice, quotation.currency)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {quotation.orderNumber && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Vytvořená objednávka: {quotation.orderNumber}
                </Typography>
              )}
              {quotation.note && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Poznámka: {quotation.note}
                </Typography>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

const EMPTY_ITEM_ROW = { itemId: '', quantity: 1, unitPrice: '', totalPrice: '' };

/**
 * Dialog for creating a new quotation or editing an existing one. The mechanism is
 * the same as for orders, except that the unit price or the line total of each item
 * may be overridden manually; a blank price means "use the current item price"
 * (resp. quantity × unit price for the line total).
 */
function QuotationFormDialog({ open, quotation, onClose, onSaved }) {
  const { activeCompany } = useCompany() || {};
  const [customers, setCustomers] = useState([]);
  const [reps, setReps] = useState([]);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({
    customerId: '',
    salesRepresentativeId: '',
    quotationDate: dayjs().format('YYYY-MM-DD'),
    validUntil: '',
    currency: 'CZK',
    note: '',
    items: [{ ...EMPTY_ITEM_ROW }],
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    setForm(
      quotation
        ? {
            customerId: quotation.customerId || '',
            salesRepresentativeId: quotation.salesRepresentativeId || '',
            quotationDate: quotation.quotationDate || dayjs().format('YYYY-MM-DD'),
            validUntil: quotation.validUntil || '',
            currency: quotation.currency || 'CZK',
            note: quotation.note || '',
            items:
              (quotation.items || []).length > 0
                ? quotation.items.map((i) => ({
                    itemId: i.itemId || '',
                    quantity: i.quantity,
                    unitPrice: i.unitPrice ?? '',
                    totalPrice: i.totalPrice ?? '',
                  }))
                : [{ ...EMPTY_ITEM_ROW }],
          }
        : {
            customerId: '',
            salesRepresentativeId: '',
            quotationDate: dayjs().format('YYYY-MM-DD'),
            validUntil: '',
            currency: 'CZK',
            note: '',
            items: [{ ...EMPTY_ITEM_ROW }],
          }
    );
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
  }, [open, quotation]);

  // Computes quantity × unit price, or '' when either value is missing/invalid.
  const computeTotal = (quantity, unitPrice) => {
    const q = Number(quantity);
    const p = Number(unitPrice);
    if (quantity === '' || unitPrice === '' || Number.isNaN(q) || Number.isNaN(p)) return '';
    return String(Math.round(q * p * 100) / 100);
  };

  const setItemRow = (idx, field, value) =>
    setForm((f) => ({
      ...f,
      items: f.items.map((row, i) => {
        if (i !== idx) return row;
        const next = { ...row, [field]: value };
        // Selecting an item prefills the unit price from its current price list entry.
        if (field === 'itemId') {
          const item = items.find((it) => it.id === value);
          next.unitPrice = item?.price?.price ?? '';
        }
        // Any change of item, quantity or unit price recomputes the line total.
        if (field === 'itemId' || field === 'quantity' || field === 'unitPrice') {
          next.totalPrice = computeTotal(next.quantity, next.unitPrice);
        }
        return next;
      }),
    }));

  // Adds the items picked in the search dialog as new rows; already present
  // items are skipped and blank rows are dropped.
  const handlePicked = (picked) => {
    setItems((list) => [...list, ...picked.filter((p) => !list.some((i) => i.id === p.id))]);
    setForm((f) => {
      const kept = f.items.filter((r) => r.itemId);
      const added = picked
        .filter((p) => !kept.some((r) => r.itemId === p.id))
        .map((p) => ({
          ...EMPTY_ITEM_ROW,
          itemId: p.id,
          unitPrice: p.price?.price ?? '',
          totalPrice: computeTotal(EMPTY_ITEM_ROW.quantity, p.price?.price ?? ''),
        }));
      const next = [...kept, ...added];
      return { ...f, items: next.length > 0 ? next : [{ ...EMPTY_ITEM_ROW }] };
    });
  };

  const handleSave = async () => {
    const validItems = form.items.filter((i) => i.itemId && Number(i.quantity) > 0);
    if (!form.customerId || !form.salesRepresentativeId || validItems.length === 0) {
      setError('Vyplňte zákazníka, obchodního zástupce a alespoň jednu položku.');
      return;
    }
    if (validItems.some((i) => (i.unitPrice !== '' && Number(i.unitPrice) < 0)
        || (i.totalPrice !== '' && Number(i.totalPrice) < 0))) {
      setError('Ceny položek nesmí být záporné.');
      return;
    }
    setSaving(true);
    setError('');
    const payload = {
      customerId: form.customerId,
      // Own company issuing the quotation; the backend falls back to the default company.
      companyId: activeCompany?.id || quotation?.companyId || null,
      contactPersonId: quotation?.contactPersonId || null,
      salesRepresentativeId: form.salesRepresentativeId,
      quotationDate: form.quotationDate,
      validUntil: form.validUntil || null,
      currency: form.currency,
      note: form.note || null,
      items: validItems.map((i) => ({
        itemId: i.itemId,
        quantity: Number(i.quantity),
        // Blank prices are sent as null so the backend uses the current item price.
        unitPrice: i.unitPrice === '' ? null : Number(i.unitPrice),
        totalPrice: i.totalPrice === '' ? null : Number(i.totalPrice),
      })),
    };
    try {
      const { data } = quotation
        ? await client.put(`/quotations/${quotation.id}`, payload)
        : await client.post('/quotations', payload);
      onSaved(data);
      onClose();
    } catch {
      setError(quotation ? 'Uložení nabídky se nezdařilo.' : 'Vytvoření nabídky se nezdařilo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {quotation ? `Upravit nabídku ${quotation.quotationNumber}` : 'Nová cenová nabídka'}
      </DialogTitle>
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
          <Grid item xs={12} sm={4}>
            <TextField
              label="Datum nabídky"
              type="date"
              value={form.quotationDate}
              onChange={(e) => setForm((f) => ({ ...f, quotationDate: e.target.value }))}
              required
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Platnost do"
              type="date"
              value={form.validUntil}
              onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value }))}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
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
            <Typography variant="caption" color="text.secondary">
              Prázdná cena/ks znamená aktuální cenu z ceníku, prázdné celkem se dopočítá jako
              množství × cena/ks.
            </Typography>
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
                  sx={{ width: 100 }}
                />
                <TextField
                  label="Cena/ks"
                  type="number"
                  size="small"
                  value={row.unitPrice}
                  onChange={(e) => setItemRow(idx, 'unitPrice', e.target.value)}
                  inputProps={{ min: 0, step: 0.01 }}
                  sx={{ width: 130 }}
                />
                <TextField
                  label="Celkem"
                  type="number"
                  size="small"
                  value={row.totalPrice}
                  onChange={(e) => setItemRow(idx, 'totalPrice', e.target.value)}
                  inputProps={{ min: 0, step: 0.01 }}
                  sx={{ width: 130 }}
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
                setForm((f) => ({ ...f, items: [...f.items, { ...EMPTY_ITEM_ROW }] }))
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
          {saving ? 'Ukládám…' : quotation ? 'Uložit' : 'Vytvořit'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function QuotationsPage() {
  const { activeCompany } = useCompany() || {};
  const [quotations, setQuotations] = useState([]);
  const [filters, setFilters] = useState([]);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snack, setSnack] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', page);
    params.set('size', size);
    params.set('sort', 'quotationDate,desc');
    // The list is scoped to the currently selected own company.
    if (activeCompany) params.append('filter', `company.id:eq:${activeCompany.id}`);
    filters.forEach((f) => params.append('filter', f));
    client
      .get('/quotations/search', { params })
      .then((res) => {
        setQuotations(res.data.content || []);
        setTotal(res.data.totalElements ?? 0);
      })
      .catch(() => setError('Nepodařilo se načíst cenové nabídky.'))
      .finally(() => setLoading(false));
  }, [page, size, filters, activeCompany]);

  useEffect(load, [load]);

  const handleStatusChange = async (quotation, status) => {
    try {
      await client.post(`/quotations/${quotation.id}/status/${status}`);
      setSnack(
        `Nabídka ${quotation.quotationNumber} má nový stav: ${QUOTATION_STATUS_LABELS[status]}.`
      );
      load();
    } catch {
      setError('Změna stavu se nezdařila.');
    }
  };

  const handleSendEmail = async (quotation) => {
    try {
      await client.post(`/quotations/${quotation.id}/send-email`);
      setSnack(`Nabídka ${quotation.quotationNumber} byla odeslána zákazníkovi e-mailem.`);
      load();
    } catch (e) {
      setError(e.response?.data?.message || 'Odeslání nabídky e-mailem se nezdařilo.');
    }
  };

  const handleCreateOrder = async (quotation) => {
    try {
      const { data } = await client.post(`/quotations/${quotation.id}/create-order`);
      setSnack(
        `Z nabídky ${quotation.quotationNumber} byla vytvořena objednávka ${data.orderNumber}.`
      );
      load();
    } catch (e) {
      setError(e.response?.data?.message || 'Vytvoření objednávky z nabídky se nezdařilo.');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          Cenové nabídky
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Nová nabídka
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
              <TableCell>Platnost do</TableCell>
              <TableCell align="right">Cena</TableCell>
              <TableCell>Stav</TableCell>
              <TableCell align="right">Akce</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {quotations.map((q) => (
              <QuotationRow
                key={q.id}
                quotation={q}
                onStatusChange={handleStatusChange}
                onEdit={setEditingQuotation}
                onSendEmail={handleSendEmail}
                onCreateOrder={handleCreateOrder}
              />
            ))}
            {quotations.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={10} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    Žádné cenové nabídky.
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

      <QuotationFormDialog
        open={dialogOpen || !!editingQuotation}
        quotation={editingQuotation}
        onClose={() => {
          setDialogOpen(false);
          setEditingQuotation(null);
        }}
        onSaved={() => {
          setSnack(
            editingQuotation ? 'Cenová nabídka byla upravena.' : 'Cenová nabídka byla vytvořena.'
          );
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
