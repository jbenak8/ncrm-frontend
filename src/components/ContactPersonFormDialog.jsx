import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Switch,
  TextField,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import client from '../api/client';
import { customerToPayload } from '../utils/customerPayload';

const emptyForm = {
  firstName: '',
  lastName: '',
  position: '',
  email: '',
  phone: '',
  note: '',
  active: true,
};

/**
 * Dialog for adding a new contact person to an existing customer. The person is
 * appended to the customer's contactPersons collection and the whole customer
 * is saved via PUT /customers/{id}.
 */
export default function ContactPersonFormDialog({ open, customer, onClose, onSaved }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    setForm({ ...emptyForm });
  }, [open]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSave = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('Jméno a příjmení jsou povinné.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...customerToPayload(customer),
        contactPersons: [...(customer.contactPersons || []), form],
      };
      const { data } = await client.put(`/customers/${customer.id}`, payload);
      onSaved(data);
      onClose();
    } catch {
      setError('Uložení kontaktní osoby se nezdařilo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Nová kontaktní osoba</DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Jméno"
              value={form.firstName}
              onChange={set('firstName')}
              required
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Příjmení"
              value={form.lastName}
              onChange={set('lastName')}
              required
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="Pozice" value={form.position} onChange={set('position')} fullWidth />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex', alignItems: 'center' }}>
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
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="E-mail" value={form.email} onChange={set('email')} fullWidth />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="Telefon" value={form.phone} onChange={set('phone')} fullWidth />
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
