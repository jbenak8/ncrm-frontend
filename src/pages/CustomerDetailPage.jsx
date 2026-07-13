import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  Snackbar,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import client from '../api/client';
import CustomerFormDialog from '../components/CustomerFormDialog';
import {
  formatDateTime,
  formatMoney,
  MEETING_STATUS_LABELS,
  ORDER_STATUS_LABELS,
  STATUS_COLORS,
} from '../utils/format';

function addressToString(a) {
  if (!a) return '—';
  const line1 = [a.street, a.houseNumber].filter(Boolean).join(' ');
  const line2 = [a.zipCode, a.city].filter(Boolean).join(' ');
  return [line1, line2, a.countryName].filter(Boolean).join(', ') || '—';
}

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [tab, setTab] = useState(0);
  const [error, setError] = useState('');
  const [snack, setSnack] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(() => {
    client
      .get(`/customers/${id}`)
      .then((res) => setCustomer(res.data))
      .catch(() => setError('Nepodařilo se načíst zákazníka.'));
    client
      .get(`/orders/by-customer/${id}`)
      .then((res) => setOrders(res.data))
      .catch(() => setOrders([]));
    client
      .get(`/meetings/by-customer/${id}`)
      .then((res) => setMeetings(res.data))
      .catch(() => setMeetings([]));
  }, [id]);

  useEffect(load, [load]);

  const downloadReport = async () => {
    try {
      const res = await client.get(`/reports/customer/${id}/orders`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `objednavky-${customer?.name || id}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Report se nepodařilo stáhnout.');
    }
  };

  if (!customer && !error)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
        <CircularProgress />
      </Box>
    );

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {customer && (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <IconButton onClick={() => navigate('/customers')}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h5" fontWeight={700} sx={{ flexGrow: 1 }}>
              {customer.name}
            </Typography>
            <Chip
              label={customer.active ? 'Aktivní' : 'Neaktivní'}
              color={customer.active ? 'success' : 'default'}
            />
            <Tooltip title="Stáhnout PDF report objednávek">
              <Button startIcon={<PictureAsPdfIcon />} onClick={downloadReport}>
                Report
              </Button>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={() => setDialogOpen(true)}
            >
              Upravit
            </Button>
          </Box>

          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={3}>
                  <Typography variant="caption" color="text.secondary">
                    IČO / DIČ
                  </Typography>
                  <Typography>
                    {customer.registrationId} {customer.vatId ? `/ ${customer.vatId}` : ''}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Typography variant="caption" color="text.secondary">
                    Kontakt
                  </Typography>
                  <Typography>{customer.email || '—'}</Typography>
                  <Typography>{customer.phone || '—'}</Typography>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Typography variant="caption" color="text.secondary">
                    Sídlo
                  </Typography>
                  <Typography>{addressToString(customer.headquartersAddress)}</Typography>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Typography variant="caption" color="text.secondary">
                    Obchodní zástupce
                  </Typography>
                  <Typography>{customer.salesRepresentativeName || '—'}</Typography>
                </Grid>
                {customer.note && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Poznámka
                    </Typography>
                    <Typography>{customer.note}</Typography>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>

          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
            <Tab label={`Kontaktní osoby (${customer.contactPersons?.length || 0})`} />
            <Tab label={`Provozovny (${customer.sites?.length || 0})`} />
            <Tab label={`Objednávky (${orders.length})`} />
            <Tab label={`Schůzky (${meetings.length})`} />
          </Tabs>

          {tab === 0 && (
            <Card>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Jméno</TableCell>
                    <TableCell>Pozice</TableCell>
                    <TableCell>E-mail</TableCell>
                    <TableCell>Telefon</TableCell>
                    <TableCell>Stav</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(customer.contactPersons || []).map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        {p.firstName} {p.lastName}
                      </TableCell>
                      <TableCell>{p.position || '—'}</TableCell>
                      <TableCell>{p.email || '—'}</TableCell>
                      <TableCell>{p.phone || '—'}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={p.active !== false ? 'Aktivní' : 'Neaktivní'}
                          color={p.active !== false ? 'success' : 'default'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {(customer.contactPersons || []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                          Žádné kontaktní osoby.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          )}

          {tab === 1 && (
            <Card>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Název</TableCell>
                    <TableCell>Adresa</TableCell>
                    <TableCell>Poznámka</TableCell>
                    <TableCell>Stav</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(customer.sites || []).map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.name}</TableCell>
                      <TableCell>{addressToString(s.address)}</TableCell>
                      <TableCell>{s.note || '—'}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={s.active !== false ? 'Aktivní' : 'Neaktivní'}
                          color={s.active !== false ? 'success' : 'default'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {(customer.sites || []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                          Žádné provozovny.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          )}

          {tab === 2 && (
            <Card>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Číslo</TableCell>
                    <TableCell>Datum</TableCell>
                    <TableCell align="right">Cena</TableCell>
                    <TableCell>Stav</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {orders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell>{o.orderNumber}</TableCell>
                      <TableCell>{formatDateTime(o.orderDate)}</TableCell>
                      <TableCell align="right">{formatMoney(o.totalPrice, o.currency)}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={ORDER_STATUS_LABELS[o.status] || o.status}
                          color={STATUS_COLORS[o.status] || 'default'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {orders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                          Žádné objednávky.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          )}

          {tab === 3 && (
            <Card>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Termín</TableCell>
                    <TableCell>Předmět</TableCell>
                    <TableCell>Zástupce</TableCell>
                    <TableCell>Stav</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {meetings.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>{formatDateTime(m.plannedDate)}</TableCell>
                      <TableCell>{m.subject}</TableCell>
                      <TableCell>{m.salesRepresentativeName || '—'}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={MEETING_STATUS_LABELS[m.status] || m.status}
                          color={STATUS_COLORS[m.status] || 'default'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {meetings.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                          Žádné schůzky.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          )}

          <CustomerFormDialog
            open={dialogOpen}
            customer={customer}
            onClose={() => setDialogOpen(false)}
            onSaved={() => {
              setSnack('Zákazník byl uložen.');
              load();
            }}
          />
        </>
      )}
      <Snackbar
        open={!!snack}
        autoHideDuration={4000}
        onClose={() => setSnack('')}
        message={snack}
      />
    </Box>
  );
}
