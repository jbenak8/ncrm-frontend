import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
  InputAdornment,
  MenuItem,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import client from '../api/client';

const emptyAddress = {
  street: '',
  houseNumber: '',
  city: '',
  zipCode: '',
  countryIsoCode: 'CZ',
  countryName: 'Česká republika',
};

const emptyForm = {
  designation: '',
  name: '',
  registrationId: '',
  vatId: '',
  email: '',
  phone: '',
  headquartersAddress: { ...emptyAddress },
  salesRepresentativeId: '',
  active: true,
  note: '',
};

/**
 * Create / edit customer dialog with ARES lookup: after entering the registration id (IČO)
 * the "Načíst z ARES" button fills in name, VAT id and headquarters address from the registry.
 */
export default function CustomerFormDialog({ open, customer, onClose, onSaved }) {
  const [form, setForm] = useState(emptyForm);
  const [reps, setReps] = useState([]);
  const [error, setError] = useState('');
  const [aresLoading, setAresLoading] = useState(false);
  const [aresInfo, setAresInfo] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    setAresInfo('');
    if (customer) {
      setForm({
        designation: customer.designation || '',
        name: customer.name || '',
        registrationId: customer.registrationId || '',
        vatId: customer.vatId || '',
        email: customer.email || '',
        phone: customer.phone || '',
        headquartersAddress: { ...emptyAddress, ...(customer.headquartersAddress || {}) },
        salesRepresentativeId: customer.salesRepresentativeId || '',
        active: customer.active !== false,
        note: customer.note || '',
      });
    } else {
      setForm({ ...emptyForm, headquartersAddress: { ...emptyAddress } });
    }
    client
      .get('/users/sales-representatives')
      .then((res) => setReps(res.data))
      .catch(() => setReps([]));
  }, [open, customer]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const setAddr = (field) => (e) =>
    setForm((f) => ({
      ...f,
      headquartersAddress: { ...f.headquartersAddress, [field]: e.target.value },
    }));

  const handleAresLookup = async () => {
    const regId = form.registrationId.trim();
    if (!regId) {
      setError('Pro vyhledání v ARES zadejte IČO.');
      return;
    }
    setError('');
    setAresInfo('');
    setAresLoading(true);
    try {
      const { data } = await client.get(`/ares/${encodeURIComponent(regId)}`);
      setForm((f) => ({
        ...f,
        name: data.name || f.name,
        vatId: data.vatId || f.vatId,
        registrationId: data.registrationId || f.registrationId,
        headquartersAddress: data.address
          ? { ...emptyAddress, ...data.address }
          : f.headquartersAddress,
      }));
      setAresInfo(
        `Data načtena z ARES${data.legalForm ? ` (právní forma: ${data.legalForm})` : ''}.`
      );
    } catch (e) {
      if (e.response && e.response.status === 404) {
        setError(`Subjekt s IČO ${regId} nebyl v ARES nalezen.`);
      } else {
        setError('Vyhledání v ARES se nezdařilo.');
      }
    } finally {
      setAresLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.registrationId.trim()) {
      setError('Název a IČO jsou povinné.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        salesRepresentativeId: form.salesRepresentativeId || null,
      };
      const { data } = customer
        ? await client.put(`/customers/${customer.id}`, payload)
        : await client.post('/customers', payload);
      onSaved(data);
      onClose();
    } catch (e) {
      setError('Uložení zákazníka se nezdařilo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{customer ? 'Upravit zákazníka' : 'Nový zákazník'}</DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {aresInfo && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {aresInfo}
          </Alert>
        )}
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="IČO"
              value={form.registrationId}
              onChange={set('registrationId')}
              required
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="Doplnit údaje z registru ARES">
                      <span>
                        <Button
                          size="small"
                          onClick={handleAresLookup}
                          disabled={aresLoading}
                          startIcon={
                            aresLoading ? (
                              <CircularProgress size={16} />
                            ) : (
                              <TravelExploreIcon fontSize="small" />
                            )
                          }
                        >
                          ARES
                        </Button>
                      </span>
                    </Tooltip>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="DIČ" value={form.vatId} onChange={set('vatId')} fullWidth />
          </Grid>
          <Grid item xs={12} sm={8}>
            <TextField label="Název" value={form.name} onChange={set('name')} required fullWidth />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Označení"
              value={form.designation}
              onChange={set('designation')}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="E-mail" value={form.email} onChange={set('email')} fullWidth />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Telefon" value={form.phone} onChange={set('phone')} fullWidth />
          </Grid>

          <Grid item xs={12}>
            <Divider>
              <Typography variant="caption" color="text.secondary">
                Adresa sídla
              </Typography>
            </Divider>
          </Grid>
          <Grid item xs={12} sm={8}>
            <TextField
              label="Ulice"
              value={form.headquartersAddress.street}
              onChange={setAddr('street')}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Číslo popisné"
              value={form.headquartersAddress.houseNumber}
              onChange={setAddr('houseNumber')}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={5}>
            <TextField
              label="Město"
              value={form.headquartersAddress.city}
              onChange={setAddr('city')}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              label="PSČ"
              value={form.headquartersAddress.zipCode}
              onChange={setAddr('zipCode')}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Země"
              value={form.headquartersAddress.countryName}
              onChange={setAddr('countryName')}
              fullWidth
            />
          </Grid>

          <Grid item xs={12} sm={8}>
            <TextField
              select
              label="Obchodní zástupce"
              value={form.salesRepresentativeId}
              onChange={set('salesRepresentativeId')}
              fullWidth
            >
              <MenuItem value="">— nepřiřazen —</MenuItem>
              {reps.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  {r.firstName} {r.lastName} {r.region ? `(${r.region})` : ''}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4} sx={{ display: 'flex', alignItems: 'center' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={form.active}
                  onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                />
              }
              label="Aktivní"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Poznámka"
              value={form.note}
              onChange={set('note')}
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
