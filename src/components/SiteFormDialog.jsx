import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import client from '../api/client';
import { customerToPayload } from '../utils/customerPayload';

const emptyAddress = {
  street: '',
  houseNumber: '',
  streetNumber: '',
  city: '',
  zipCode: '',
  countryIsoCode: 'CZ',
  countryName: 'Česká republika',
};

const emptyForm = {
  name: '',
  address: { ...emptyAddress },
  note: '',
  active: true,
};

/**
 * Dialog for adding a new site (provozovna) to an existing customer. The site is
 * appended to the customer's sites collection and the whole customer is saved
 * via PUT /customers/{id}.
 */
export default function SiteFormDialog({ open, customer, onClose, onSaved }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    setForm({ ...emptyForm, address: { ...emptyAddress } });
  }, [open]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const setAddr = (field) => (e) =>
    setForm((f) => ({ ...f, address: { ...f.address, [field]: e.target.value } }));

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Název provozovny je povinný.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...customerToPayload(customer),
        sites: [...(customer.sites || []), form],
      };
      const { data } = await client.put(`/customers/${customer.id}`, payload);
      onSaved(data);
      onClose();
    } catch {
      setError('Uložení provozovny se nezdařilo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Nová provozovna</DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 8 }}>
            <TextField
              label="Název"
              value={form.name}
              onChange={set('name')}
              required
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }} sx={{ display: 'flex', alignItems: 'center' }}>
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

          <Grid size={{ xs: 12 }}>
            <Divider>
              <Typography variant="caption" color="text.secondary">
                Adresa provozovny
              </Typography>
            </Divider>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Ulice"
              value={form.address.street}
              onChange={setAddr('street')}
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 3 }}>
            <TextField
              label="Číslo popisné"
              value={form.address.houseNumber}
              onChange={setAddr('houseNumber')}
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 3 }}>
            <TextField
              label="Číslo orientační"
              value={form.address.streetNumber}
              onChange={setAddr('streetNumber')}
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 5 }}>
            <TextField
              label="Město"
              value={form.address.city}
              onChange={setAddr('city')}
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 3 }}>
            <TextField
              label="PSČ"
              value={form.address.zipCode}
              onChange={setAddr('zipCode')}
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              label="Země"
              value={form.address.countryName}
              onChange={setAddr('countryName')}
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
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
