import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  ListItemText,
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
import SendIcon from '@mui/icons-material/Send';
import CancelIcon from '@mui/icons-material/Cancel';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import client from '../api/client';
import { CAMPAIGN_STATUS_LABELS, formatDateTime, STATUS_COLORS } from '../utils/format';

function CampaignRow({ campaign, onSend, onCancel }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TableRow hover>
        <TableCell padding="checkbox">
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell>{campaign.name}</TableCell>
        <TableCell>{campaign.subject}</TableCell>
        <TableCell>{campaign.createdByName || '—'}</TableCell>
        <TableCell>{formatDateTime(campaign.sentAt || campaign.scheduledAt)}</TableCell>
        <TableCell>{campaign.recipients?.length || 0}</TableCell>
        <TableCell>
          <Chip
            size="small"
            label={CAMPAIGN_STATUS_LABELS[campaign.status] || campaign.status}
            color={STATUS_COLORS[campaign.status] || 'default'}
          />
        </TableCell>
        <TableCell align="right">
          {['DRAFT', 'SCHEDULED'].includes(campaign.status) && (
            <>
              <Tooltip title="Odeslat">
                <IconButton size="small" color="primary" onClick={() => onSend(campaign)}>
                  <SendIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Zrušit">
                <IconButton size="small" color="error" onClick={() => onCancel(campaign)}>
                  <CancelIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={8} sx={{ py: 0, borderBottom: open ? undefined : 'none' }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ my: 1 }}>
              <Typography variant="subtitle2">Obsah</Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 1 }}>
                {campaign.body}
              </Typography>
              <Typography variant="subtitle2">Příjemci</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Zákazník</TableCell>
                    <TableCell>E-mail</TableCell>
                    <TableCell>Doručení</TableCell>
                    <TableCell>Odesláno</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(campaign.recipients || []).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.customerName}</TableCell>
                      <TableCell>{r.email}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={r.deliveryStatus}
                          color={
                            r.deliveryStatus === 'SENT'
                              ? 'success'
                              : r.deliveryStatus === 'FAILED'
                                ? 'error'
                                : 'default'
                          }
                        />
                      </TableCell>
                      <TableCell>{formatDateTime(r.sentAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

function NewCampaignDialog({ open, onClose, onSaved }) {
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({
    name: '',
    subject: '',
    body: '',
    contentSource: 'MANUAL',
    scheduledAt: '',
    customerIds: [],
  });
  const [ai, setAi] = useState({ topic: '', audience: '', tone: '', provider: 'CLAUDE' });
  const [aiLoading, setAiLoading] = useState(false);
  const [showAi, setShowAi] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    setShowAi(false);
    setForm({
      name: '',
      subject: '',
      body: '',
      contentSource: 'MANUAL',
      scheduledAt: '',
      customerIds: [],
    });
    setAi({ topic: '', audience: '', tone: '', provider: 'CLAUDE' });
    client
      .get('/customers', { params: { page: 0, size: 1000, sort: 'name,asc' } })
      .then((res) => setCustomers((res.data.content || []).filter((c) => c.active !== false)))
      .catch(() => setCustomers([]));
  }, [open]);

  const handleGenerate = async () => {
    if (!ai.topic.trim()) {
      setError('Zadejte téma pro AI generování.');
      return;
    }
    setError('');
    setAiLoading(true);
    try {
      const { data } = await client.post('/campaigns/generate-content', {
        topic: ai.topic,
        audience: ai.audience || null,
        tone: ai.tone || null,
        language: 'cs',
        provider: ai.provider,
      });
      setForm((f) => ({ ...f, body: data.content || '', contentSource: 'AI_GENERATED' }));
    } catch {
      setError('AI generování obsahu se nezdařilo.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.subject.trim() || !form.body.trim() || form.customerIds.length === 0) {
      setError('Vyplňte název, předmět, obsah a alespoň jednoho příjemce.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const { data } = await client.post('/campaigns', {
        name: form.name,
        subject: form.subject,
        body: form.body,
        contentSource: form.contentSource,
        scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
        customerIds: form.customerIds,
      });
      onSaved(data);
      onClose();
    } catch {
      setError('Vytvoření kampaně se nezdařilo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Nová kampaň</DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Název kampaně"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Předmět e-mailu"
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              required
              fullWidth
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              select
              label="Příjemci (zákazníci)"
              value={form.customerIds}
              onChange={(e) => setForm((f) => ({ ...f, customerIds: e.target.value }))}
              SelectProps={{
                multiple: true,
                renderValue: (selected) =>
                  customers
                    .filter((c) => selected.includes(c.id))
                    .map((c) => c.name)
                    .join(', '),
              }}
              required
              fullWidth
            >
              {customers.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  <Checkbox checked={form.customerIds.includes(c.id)} size="small" />
                  <ListItemText primary={c.name} secondary={c.email || 'bez e-mailu'} />
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Naplánovat na"
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} sx={{ display: 'flex', alignItems: 'center' }}>
            <FormControlLabel
              control={
                <Checkbox checked={showAi} onChange={(e) => setShowAi(e.target.checked)} />
              }
              label="Vygenerovat obsah pomocí AI"
            />
          </Grid>

          {showAi && (
            <>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Téma"
                  value={ai.topic}
                  onChange={(e) => setAi((a) => ({ ...a, topic: e.target.value }))}
                  required
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  label="Cílová skupina"
                  value={ai.audience}
                  onChange={(e) => setAi((a) => ({ ...a, audience: e.target.value }))}
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={2}>
                <TextField
                  label="Tón"
                  value={ai.tone}
                  onChange={(e) => setAi((a) => ({ ...a, tone: e.target.value }))}
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={2}>
                <TextField
                  select
                  label="AI model"
                  value={ai.provider}
                  onChange={(e) => setAi((a) => ({ ...a, provider: e.target.value }))}
                  fullWidth
                  size="small"
                >
                  <MenuItem value="CLAUDE">Claude</MenuItem>
                  <MenuItem value="CHATGPT">ChatGPT</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={1} sx={{ display: 'flex', alignItems: 'center' }}>
                <Tooltip title="Vygenerovat obsah">
                  <span>
                    <IconButton color="primary" onClick={handleGenerate} disabled={aiLoading}>
                      {aiLoading ? <CircularProgress size={22} /> : <AutoAwesomeIcon />}
                    </IconButton>
                  </span>
                </Tooltip>
              </Grid>
            </>
          )}

          <Grid item xs={12}>
            <TextField
              label="Obsah kampaně"
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              required
              fullWidth
              multiline
              minRows={8}
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

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [error, setError] = useState('');
  const [snack, setSnack] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(() => {
    client
      .get('/campaigns')
      .then((res) => setCampaigns(res.data))
      .catch(() => setError('Nepodařilo se načíst kampaně.'));
  }, []);

  useEffect(load, [load]);

  const handleSend = async (campaign) => {
    if (!window.confirm(`Opravdu odeslat kampaň „${campaign.name}“?`)) return;
    try {
      await client.post(`/campaigns/${campaign.id}/send`);
      setSnack('Kampaň byla odeslána.');
      load();
    } catch {
      setError('Odeslání kampaně se nezdařilo.');
    }
  };

  const handleCancel = async (campaign) => {
    if (!window.confirm(`Opravdu zrušit kampaň „${campaign.name}“?`)) return;
    try {
      await client.post(`/campaigns/${campaign.id}/cancel`);
      setSnack('Kampaň byla zrušena.');
      load();
    } catch {
      setError('Zrušení kampaně se nezdařilo.');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          Marketingové kampaně
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Nová kampaň
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell>Název</TableCell>
              <TableCell>Předmět</TableCell>
              <TableCell>Vytvořil</TableCell>
              <TableCell>Odesláno / naplánováno</TableCell>
              <TableCell>Příjemců</TableCell>
              <TableCell>Stav</TableCell>
              <TableCell align="right">Akce</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {campaigns.map((c) => (
              <CampaignRow key={c.id} campaign={c} onSend={handleSend} onCancel={handleCancel} />
            ))}
            {campaigns.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    Žádné kampaně.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <NewCampaignDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={() => {
          setSnack('Kampaň byla vytvořena.');
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
