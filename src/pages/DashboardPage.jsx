import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
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
import {
  formatDateTime,
  formatMoney,
  MEETING_STATUS_LABELS,
  ORDER_STATUS_LABELS,
  STATUS_COLORS,
} from '../utils/format';

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

function OwnerDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    client
      .get('/dashboard')
      .then((res) => setData(res.data))
      .catch(() => setError('Nepodařilo se načíst data dashboardu.'));
  }, []);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
        <CircularProgress />
      </Box>
    );

  const s = data.summary || {};
  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Zákazníci"
          value={s.totalCustomers ?? 0}
          subtitle={`${s.activeCustomers ?? 0} aktivních`}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Objednávky"
          value={s.totalOrders ?? 0}
          subtitle={`${s.openOrders ?? 0} otevřených`}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard title="Tržby celkem" value={formatMoney(s.totalRevenue)} />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Schůzky"
          value={s.plannedMeetings ?? 0}
          subtitle={`${s.completedMeetings ?? 0} dokončených, ${s.sentCampaigns ?? 0} kampaní odesláno`}
        />
      </Grid>

      <Grid item xs={12} md={7}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Objednávky a tržby po měsících
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.ordersByMonth || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="orderCount" name="Objednávky" fill="#1565c0" />
                <Bar yAxisId="right" dataKey="revenue" name="Tržby" fill="#00897b" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={5}>
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
                  <TableCell align="right">Tržby</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data.topCustomers || []).map((c) => (
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

      <Grid item xs={12}>
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
                  <TableCell align="right">Tržby</TableCell>
                  <TableCell align="right">Schůzek</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data.salesByRepresentative || []).map((r) => (
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

function RepresentativeDashboard() {
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

  const openOrders = orders.filter((o) => !['COMPLETED', 'CANCELLED'].includes(o.status));
  const plannedMeetings = meetings
    .filter((m) => m.status === 'PLANNED')
    .sort((a, b) => (a.plannedDate || '').localeCompare(b.plannedDate || ''));

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard title="Objednávky" value={orders.length} subtitle={`${openOrders.length} otevřených`} />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard title="Plánované schůzky" value={plannedMeetings.length} />
      </Grid>

      <Grid item xs={12} md={6}>
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

      <Grid item xs={12} md={6}>
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
                {orders.slice(0, 8).map((o) => (
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

export default function DashboardPage() {
  const { isOwner, user } = useAuth();
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.username || '';

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Vítejte, {displayName}
      </Typography>
      {isOwner ? <OwnerDashboard /> : <RepresentativeDashboard />}
    </Box>
  );
}
