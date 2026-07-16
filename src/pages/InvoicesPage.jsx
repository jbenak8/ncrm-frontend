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
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PrintIcon from '@mui/icons-material/Print';
import EmailIcon from '@mui/icons-material/Email';
import client from '../api/client';
import SearchFilterBar from '../components/SearchFilterBar';
import { formatDate, formatMoney, INVOICE_PAYMENT_LABELS } from '../utils/format';
import { applyClientFilters } from '../utils/clientFilter';

// Fields offered by the search bar (filtering is done on the client).
const SEARCH_FIELDS = [
  { name: 'invoiceNumber', label: 'Číslo faktury', type: 'text' },
  { name: 'orderNumber', label: 'Číslo objednávky', type: 'text' },
  { name: 'customerName', label: 'Zákazník', type: 'text' },
  {
    name: 'paymentType',
    label: 'Způsob platby',
    type: 'enum',
    options: Object.entries(INVOICE_PAYMENT_LABELS).map(([value, label]) => ({ value, label })),
  },
  { name: 'issueDate', label: 'Datum vystavení', type: 'date' },
  { name: 'dueDate', label: 'Datum splatnosti', type: 'date' },
  { name: 'totalGross', label: 'Celkem s DPH', type: 'number' },
  { name: 'variableSymbol', label: 'Variabilní symbol', type: 'text' },
];

/** Detail of an issued invoice: header data and the snapshot of invoiced lines. */
function InvoiceDetailDialog({ invoice, onClose, onPrint, onSend, sending }) {
  if (!invoice) return null;
  const field = (label, value) => (
    <Grid item xs={12} sm={6} md={4}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2">{value ?? '—'}</Typography>
    </Grid>
  );
  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Faktura {invoice.invoiceNumber}</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          {field('Zákazník', invoice.customerName)}
          {field('Objednávka', invoice.orderNumber)}
          {field(
            'Způsob platby',
            INVOICE_PAYMENT_LABELS[invoice.paymentType] || invoice.paymentType
          )}
          {field('Datum vystavení', formatDate(invoice.issueDate))}
          {field('Datum zdan. plnění', formatDate(invoice.taxDate))}
          {field('Datum splatnosti', formatDate(invoice.dueDate))}
          {field('Variabilní symbol', invoice.variableSymbol || '—')}
          {field('Měna', invoice.currency)}
          {field('Poznámka', invoice.note || '—')}
        </Grid>

        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2" gutterBottom>
          Položky faktury
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Kód</TableCell>
              <TableCell>Název</TableCell>
              <TableCell align="right">Množství</TableCell>
              <TableCell align="right">Cena/j.</TableCell>
              <TableCell align="right">DPH (%)</TableCell>
              <TableCell align="right">Bez DPH</TableCell>
              <TableCell align="right">DPH</TableCell>
              <TableCell align="right">S DPH</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(invoice.items || []).map((i) => (
              <TableRow key={i.id}>
                <TableCell>{i.itemCode}</TableCell>
                <TableCell>{i.itemName}</TableCell>
                <TableCell align="right">
                  {i.quantity} {i.unit || ''}
                </TableCell>
                <TableCell align="right">{formatMoney(i.unitPrice, invoice.currency)}</TableCell>
                <TableCell align="right">{i.vatRate}</TableCell>
                <TableCell align="right">{formatMoney(i.totalNet, invoice.currency)}</TableCell>
                <TableCell align="right">{formatMoney(i.totalVat, invoice.currency)}</TableCell>
                <TableCell align="right">{formatMoney(i.totalGross, invoice.currency)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="body2">
              Celkem bez DPH: {formatMoney(invoice.totalNet, invoice.currency)}
            </Typography>
            <Typography variant="body2">
              DPH: {formatMoney(invoice.totalVat, invoice.currency)}
            </Typography>
            <Typography variant="subtitle1" fontWeight={700}>
              Celkem s DPH: {formatMoney(invoice.totalGross, invoice.currency)}
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button startIcon={<PrintIcon />} onClick={() => onPrint(invoice)}>
          Tisk PDF
        </Button>
        <Button startIcon={<EmailIcon />} onClick={() => onSend(invoice)} disabled={sending}>
          {sending ? 'Odesílám…' : 'Odeslat e-mailem'}
        </Button>
        <Button variant="contained" onClick={onClose}>
          Zavřít
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/**
 * List of issued invoices with detail, PDF print and sending the invoice to the
 * customer by e-mail. Invoices are issued from completed orders on the Orders page.
 */
export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [filters, setFilters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snack, setSnack] = useState('');
  const [detail, setDetail] = useState(null);
  const [sending, setSending] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    client
      .get('/invoices')
      .then((res) => setInvoices(res.data))
      .catch(() => setError('Nepodařilo se načíst faktury.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  // Downloads the printable PDF of the invoice (Czech VAT invoice with a payment QR code).
  const handlePrint = async (invoice) => {
    try {
      const res = await client.get(`/invoices/${invoice.id}/print`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `faktura-${invoice.invoiceNumber}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Tisk faktury se nezdařil.');
    }
  };

  const handleSend = async (invoice) => {
    setSending(true);
    try {
      await client.post(`/invoices/${invoice.id}/send`);
      setSnack(`Faktura ${invoice.invoiceNumber} byla odeslána zákazníkovi e-mailem.`);
    } catch {
      setError('Odeslání faktury e-mailem se nezdařilo.');
    } finally {
      setSending(false);
    }
  };

  const visibleInvoices = applyClientFilters(invoices, filters);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          Vydané faktury
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <SearchFilterBar fields={SEARCH_FIELDS} filters={filters} onChange={setFilters} />

      <TableContainer component={Paper}>
        {loading && <LinearProgress />}
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Číslo faktury</TableCell>
              <TableCell>Objednávka</TableCell>
              <TableCell>Zákazník</TableCell>
              <TableCell>Platba</TableCell>
              <TableCell>Vystaveno</TableCell>
              <TableCell>Splatnost</TableCell>
              <TableCell align="right">Celkem s DPH</TableCell>
              <TableCell align="right">Akce</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleInvoices.map((inv) => (
              <TableRow key={inv.id} hover>
                <TableCell>{inv.invoiceNumber}</TableCell>
                <TableCell>{inv.orderNumber}</TableCell>
                <TableCell>{inv.customerName}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={INVOICE_PAYMENT_LABELS[inv.paymentType] || inv.paymentType}
                    color={inv.paymentType === 'TRANSFER' ? 'primary' : 'default'}
                  />
                </TableCell>
                <TableCell>{formatDate(inv.issueDate)}</TableCell>
                <TableCell>{formatDate(inv.dueDate)}</TableCell>
                <TableCell align="right">{formatMoney(inv.totalGross, inv.currency)}</TableCell>
                <TableCell align="right">
                  <Tooltip title="Zobrazit detail">
                    <IconButton size="small" onClick={() => setDetail(inv)}>
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Vytisknout fakturu">
                    <IconButton size="small" onClick={() => handlePrint(inv)}>
                      <PrintIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Odeslat zákazníkovi e-mailem">
                    <IconButton size="small" onClick={() => handleSend(inv)} disabled={sending}>
                      <EmailIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {visibleInvoices.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    Žádné vydané faktury. Fakturu lze vystavit u dokončené objednávky na stránce
                    Objednávky.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <InvoiceDetailDialog
        invoice={detail}
        onClose={() => setDetail(null)}
        onPrint={handlePrint}
        onSend={handleSend}
        sending={sending}
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
