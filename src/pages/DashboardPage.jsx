import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import client from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useCompany } from '../company/CompanyContext';
import { filterByCompanyIds } from '../utils/companyFilter';
import {
  formatDate,
  formatDateTime,
  formatMoney,
  INVOICE_PAYMENT_LABELS,
  MEETING_STATUS_LABELS,
  ORDER_STATUS_LABELS,
  STATUS_COLORS,
} from '../utils/format';

const CAMPAIGN_STATUS_LABELS = {
  DRAFT: 'Koncept',
  SCHEDULED: 'Naplánovaná',
  SENDING: 'Odesílá se',
};

const CAMPAIGN_STATUS_COLORS = {
  DRAFT: 'default',
  SCHEDULED: 'info',
  SENDING: 'warning',
};

function StatCard({ title, value, subtitle }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
        <Typography variant="h4" fontWeight={700}>
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

function OwnerDashboard({ filterByCompany }) {
  const [data, setData] = useState(null);
  const [invoices, setInvoices] = useState(null);
  const [orders, setOrders] = useState(null);
  const [meetings, setMeetings] = useState(null);
  const [campaigns, setCampaigns] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      client.get('/dashboard'),
      client.get('/invoices'),
      client.get('/orders'),
      client.get('/meetings'),
      client.get('/campaigns'),
    ])
      .then(([d, i, o, m, c]) => {
        setData(d.data);
        setInvoices(i.data);
        setOrders(o.data);
        setMeetings(m.data);
        setCampaigns(c.data);
      })
      .catch(() => setError('Nepodařilo se načíst data dashboardu.'));
  }, []);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data || !invoices || !orders || !meetings || !campaigns)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
        <CircularProgress />
      </Box>
    );

  const s = data.summary || {};
  // Všechna data závislá na společnosti (objednávky, faktury, schůzky, kampaně)
  // jsou omezena na vybranou společnost (viz checkbox Zobrazit vše).
  const visibleOrders = filterByCompany(orders);
  const visibleInvoices = filterByCompany(invoices);
  const visibleMeetings = filterByCompany(meetings);
  const visibleAllCampaigns = filterByCompany(campaigns);
  const visibleCampaigns = filterByCompany(data.activeCampaigns || []);
  const openOrders = visibleOrders.filter(
    (o) => !['COMPLETED', 'CANCELLED'].includes(o.status)
  );
  // Objednávky bez přiřazeného obchodního zástupce (bez zrušených).
  const unassignedOrders = visibleOrders.filter(
    (o) => !o.salesRepresentativeId && o.status !== 'CANCELLED'
  );
  // Hodnota objednávek vybrané společnosti (bez zrušených).
  const ordersRevenue = visibleOrders
    .filter((o) => o.status !== 'CANCELLED')
    .reduce((sum, o) => sum + (o.totalPrice ?? 0), 0);
  const plannedMeetings = visibleMeetings.filter((m) => m.status === 'PLANNED').length;
  const completedMeetings = visibleMeetings.filter((m) => m.status === 'COMPLETED').length;
  const sentCampaigns = visibleAllCampaigns.filter((c) => c.status === 'SENT').length;
  // Tržby = součet vystavených faktur (fakturované objednávky).
  const invoicedRevenue = visibleInvoices.reduce((sum, inv) => sum + (inv.totalGross ?? 0), 0);
  // Tržby po měsících z vystavených faktur (klíč = YYYY-MM data vystavení).
  const invoicedByMonth = visibleInvoices.reduce((acc, inv) => {
    const month = (inv.issueDate || '').slice(0, 7);
    if (month) acc[month] = (acc[month] ?? 0) + (inv.totalGross ?? 0);
    return acc;
  }, {});
  // Objednávky po měsících z objednávek vybrané společnosti (klíč = YYYY-MM data objednávky).
  const ordersByMonthMap = visibleOrders
    .filter((o) => o.status !== 'CANCELLED')
    .reduce((acc, o) => {
      const month = (o.orderDate || '').slice(0, 7);
      if (!month) return acc;
      acc[month] = acc[month] || { month, orderCount: 0, revenue: 0 };
      acc[month].orderCount += 1;
      acc[month].revenue += o.totalPrice ?? 0;
      return acc;
    }, {});
  const ordersByMonth = Object.values(ordersByMonthMap)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((m) => ({ ...m, invoicedRevenue: invoicedByMonth[m.month] ?? 0 }));
  // Top zákazníci podle objednávek vybrané společnosti.
  const topCustomers = Object.values(
    visibleOrders
      .filter((o) => o.status !== 'CANCELLED')
      .reduce((acc, o) => {
        acc[o.customerId] = acc[o.customerId] || {
          customerId: o.customerId,
          name: o.customerName,
          orderCount: 0,
          revenue: 0,
        };
        acc[o.customerId].orderCount += 1;
        acc[o.customerId].revenue += o.totalPrice ?? 0;
        return acc;
      }, {})
  )
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
  // Výkon obchodních zástupců podle objednávek a schůzek vybrané společnosti.
  const salesByRepresentative = Object.values(
    [...visibleOrders.filter((o) => o.status !== 'CANCELLED'), ...visibleMeetings].reduce(
      (acc, item) => {
        const id = item.salesRepresentativeId;
        if (!id) return acc;
        acc[id] = acc[id] || {
          salesRepresentativeId: id,
          name: item.salesRepresentativeName,
          orderCount: 0,
          revenue: 0,
          meetingCount: 0,
        };
        if (item.orderNumber) {
          acc[id].orderCount += 1;
          acc[id].revenue += item.totalPrice ?? 0;
        } else {
          acc[id].meetingCount += 1;
        }
        return acc;
      },
      {}
    )
  ).sort((a, b) => b.revenue - a.revenue);
  return (
    <Grid container spacing={2}>
      {unassignedOrders.length > 0 && (
        <Grid size={{ xs: 12 }}>
          <Alert severity="warning">
            {unassignedOrders.length === 1
              ? 'Existuje 1 objednávka bez přiřazeného obchodního zástupce.'
              : `Existují objednávky bez přiřazeného obchodního zástupce (${unassignedOrders.length}).`}
          </Alert>
        </Grid>
      )}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <StatCard
          title="Zákazníci"
          value={s.totalCustomers ?? 0}
          subtitle={`${s.activeCustomers ?? 0} aktivních`}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <StatCard
          title="Objednávky"
          value={visibleOrders.length}
          subtitle={`${openOrders.length} otevřených`}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <StatCard
          title="Tržby celkem"
          value={formatMoney(invoicedRevenue)}
          subtitle={`Hodnota objednávek celkem: ${formatMoney(ordersRevenue)}`}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <StatCard
          title="Schůzky"
          value={plannedMeetings}
          subtitle={`${completedMeetings} dokončených, ${sentCampaigns} kampaní odesláno`}
        />
      </Grid>

      <Grid size={{ xs: 12, md: 7 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Objednávky a tržby po měsících
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ordersByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="orderCount" name="Objednávky" fill="#1565c0" />
                <Bar yAxisId="right" dataKey="invoicedRevenue" name="Tržby" fill="#00897b" />
                <Bar yAxisId="right" dataKey="revenue" name="Hodnota objednávek" fill="#f9a825" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 5 }}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Top zákazníci
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Zákazník</TableCell>
                  <TableCell align="right">Objednávek</TableCell>
                  <TableCell align="right">Hodnota objednávek</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {topCustomers.map((c) => (
                  <TableRow key={c.customerId}>
                    <TableCell>{c.name}</TableCell>
                    <TableCell align="right">{c.orderCount}</TableCell>
                    <TableCell align="right">{formatMoney(c.revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Aktivní kampaně
            </Typography>
            {visibleCampaigns.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Žádné aktivní kampaně.
              </Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Název</TableCell>
                    <TableCell>Předmět</TableCell>
                    <TableCell>Společnost</TableCell>
                    <TableCell>Stav</TableCell>
                    <TableCell>Naplánováno na</TableCell>
                    <TableCell align="right">Příjemců</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visibleCampaigns.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>{c.name}</TableCell>
                      <TableCell>{c.subject}</TableCell>
                      <TableCell>{c.companyName || '—'}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={CAMPAIGN_STATUS_LABELS[c.status] || c.status}
                          color={CAMPAIGN_STATUS_COLORS[c.status] || 'default'}
                        />
                      </TableCell>
                      <TableCell>{c.scheduledAt ? formatDateTime(c.scheduledAt) : '—'}</TableCell>
                      <TableCell align="right">{c.recipientCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Výkon obchodních zástupců
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Zástupce</TableCell>
                  <TableCell align="right">Objednávek</TableCell>
                  <TableCell align="right">Hodnota objednávek</TableCell>
                  <TableCell align="right">Schůzek</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {salesByRepresentative.map((r) => (
                  <TableRow key={r.salesRepresentativeId}>
                    <TableCell>{r.name}</TableCell>
                    <TableCell align="right">{r.orderCount}</TableCell>
                    <TableCell align="right">{formatMoney(r.revenue)}</TableCell>
                    <TableCell align="right">{r.meetingCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

function RepresentativeDashboard({ filterByCompany }) {
  const [orders, setOrders] = useState(null);
  const [meetings, setMeetings] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([client.get('/orders'), client.get('/meetings')])
      .then(([o, m]) => {
        setOrders(o.data);
        setMeetings(m.data);
      })
      .catch(() => setError('Nepodařilo se načíst data dashboardu.'));
  }, []);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!orders || !meetings)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
        <CircularProgress />
      </Box>
    );

  // Objednávky a schůzky jsou omezeny na vybranou společnost (viz checkbox Zobrazit vše).
  const visibleOrders = filterByCompany(orders);
  const openOrders = visibleOrders.filter((o) => !['COMPLETED', 'CANCELLED'].includes(o.status));
  // Objednávky bez přiřazeného obchodního zástupce (bez zrušených).
  const unassignedOrders = visibleOrders.filter(
    (o) => !o.salesRepresentativeId && o.status !== 'CANCELLED'
  );
  const plannedMeetings = filterByCompany(meetings)
    .filter((m) => m.status === 'PLANNED')
    .sort((a, b) => (a.plannedDate || '').localeCompare(b.plannedDate || ''));

  return (
    <Grid container spacing={2}>
      {unassignedOrders.length > 0 && (
        <Grid size={{ xs: 12 }}>
          <Alert severity="warning">
            {unassignedOrders.length === 1
              ? 'Existuje 1 objednávka bez přiřazeného obchodního zástupce.'
              : `Existují objednávky bez přiřazeného obchodního zástupce (${unassignedOrders.length}).`}
          </Alert>
        </Grid>
      )}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <StatCard title="Objednávky" value={visibleOrders.length} subtitle={`${openOrders.length} otevřených`} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <StatCard title="Plánované schůzky" value={plannedMeetings.length} />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Nejbližší schůzky
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Termín</TableCell>
                  <TableCell>Zákazník</TableCell>
                  <TableCell>Předmět</TableCell>
                  <TableCell>Stav</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {plannedMeetings.slice(0, 8).map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{formatDateTime(m.plannedDate)}</TableCell>
                    <TableCell>{m.customerName}</TableCell>
                    <TableCell>{m.subject}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={MEETING_STATUS_LABELS[m.status] || m.status}
                        color={STATUS_COLORS[m.status] || 'default'}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Poslední objednávky
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Číslo</TableCell>
                  <TableCell>Zákazník</TableCell>
                  <TableCell align="right">Cena</TableCell>
                  <TableCell>Stav</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleOrders.slice(0, 8).map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>{o.orderNumber}</TableCell>
                    <TableCell>{o.customerName}</TableCell>
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
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

// Dashboard přihlášeného zákazníka: zobrazuje pouze objednávky, schůzky a faktury
// přiřazené jeho zákaznickému záznamu (backend seznamy omezuje, klientský filtr
// podle customerId je pojistka).
function CustomerDashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState(null);
  const [meetings, setMeetings] = useState(null);
  const [invoices, setInvoices] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([client.get('/orders'), client.get('/meetings'), client.get('/invoices')])
      .then(([o, m, i]) => {
        setOrders(o.data);
        setMeetings(m.data);
        setInvoices(i.data);
      })
      .catch(() => setError('Nepodařilo se načíst data dashboardu.'));
  }, []);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!orders || !meetings || !invoices)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
        <CircularProgress />
      </Box>
    );

  const onlyMine = (items) =>
    user?.customerId ? items.filter((it) => it.customerId === user.customerId) : items;
  const myOrders = onlyMine(orders).sort((a, b) =>
    (b.orderDate || '').localeCompare(a.orderDate || '')
  );
  const myInvoices = onlyMine(invoices).sort((a, b) =>
    (b.issueDate || '').localeCompare(a.issueDate || '')
  );
  const myMeetings = onlyMine(meetings);
  const openOrders = myOrders.filter((o) => !['COMPLETED', 'CANCELLED'].includes(o.status));
  const plannedMeetings = myMeetings
    .filter((m) => m.status === 'PLANNED')
    .sort((a, b) => (a.plannedDate || '').localeCompare(b.plannedDate || ''));
  const invoicedTotal = myInvoices.reduce((sum, inv) => sum + (inv.totalGross ?? 0), 0);

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <StatCard
          title="Objednávky"
          value={myOrders.length}
          subtitle={`${openOrders.length} otevřených`}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <StatCard title="Plánované schůzky" value={plannedMeetings.length} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <StatCard
          title="Faktury"
          value={myInvoices.length}
          subtitle={`Celkem ${formatMoney(invoicedTotal)}`}
        />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Poslední objednávky
            </Typography>
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
                {myOrders.slice(0, 8).map((o) => (
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
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Nejbližší schůzky
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Termín</TableCell>
                  <TableCell>Předmět</TableCell>
                  <TableCell>Stav</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {plannedMeetings.slice(0, 8).map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{formatDateTime(m.plannedDate)}</TableCell>
                    <TableCell>{m.subject}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={MEETING_STATUS_LABELS[m.status] || m.status}
                        color={STATUS_COLORS[m.status] || 'default'}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Faktury
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Číslo faktury</TableCell>
                  <TableCell>Objednávka</TableCell>
                  <TableCell>Platba</TableCell>
                  <TableCell>Vystaveno</TableCell>
                  <TableCell>Splatnost</TableCell>
                  <TableCell align="right">Celkem s DPH</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {myInvoices.slice(0, 8).map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>{inv.invoiceNumber}</TableCell>
                    <TableCell>{inv.orderNumber}</TableCell>
                    <TableCell>
                      {INVOICE_PAYMENT_LABELS[inv.paymentType] || inv.paymentType}
                    </TableCell>
                    <TableCell>{formatDate(inv.issueDate)}</TableCell>
                    <TableCell>{formatDate(inv.dueDate)}</TableCell>
                    <TableCell align="right">
                      {formatMoney(inv.totalGross, inv.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

export default function DashboardPage() {
  const { isOwner, isAdmin, isCustomer, user } = useAuth();
  const { companies, activeCompany } = useCompany();
  const [showAll, setShowAll] = useState(false);
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.username || '';

  // Ids of companies whose data may be shown; null means "no restriction".
  // Default: only the currently active company. "Zobrazit vše": the administrator
  // sees everything, owner / sales representative the data of their assigned companies.
  const allowedCompanyIds = useMemo(() => {
    if (!activeCompany && companies.length === 0) return null;
    if (showAll) {
      return isAdmin ? null : companies.map((c) => c.id);
    }
    return activeCompany ? [activeCompany.id] : companies.map((c) => c.id);
  }, [showAll, isAdmin, companies, activeCompany]);

  const filterByCompany = useCallback(
    (items) => filterByCompanyIds(items, allowedCompanyIds),
    [allowedCompanyIds]
  );

  // The checkbox is available to the administrator (all data) and to the owner
  // (data of all their assigned companies).
  const showAllToggle = isAdmin || isOwner;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Vítejte, {displayName}
        </Typography>
        {showAllToggle && (
          <FormControlLabel
            control={
              <Checkbox checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
            }
            label="Zobrazit vše"
          />
        )}
      </Box>
      {isOwner ? (
        <OwnerDashboard filterByCompany={filterByCompany} />
      ) : isCustomer ? (
        <CustomerDashboard />
      ) : (
        <RepresentativeDashboard filterByCompany={filterByCompany} />
      )}
    </Box>
  );
}
