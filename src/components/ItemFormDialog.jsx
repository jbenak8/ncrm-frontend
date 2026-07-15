import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  MenuItem,
  Switch,
  TextField,
} from '@mui/material';
import client from '../api/client';

const emptyForm = {
  code: '',
  name: '',
  description: '',
  itemType: 'GOODS',
  categoryId: '',
  unit: '',
  active: true,
  price: '',
  currency: 'CZK',
  vatRate: '',
};

/**
 * Create / edit dialog of a catalogue item including its current price.
 * `categories` is the flattened category tree (with `level`) used for the select box.
 */
export default function ItemFormDialog({ open, item, categories, onClose, onSaved }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    setForm(
      item
        ? {
            code: item.code || '',
            name: item.name || '',
            description: item.description || '',
            itemType: item.itemType || 'GOODS',
            categoryId: item.categoryId || '',
            unit: item.unit || '',
            active: item.active !== false,
            price: item.price?.price ?? '',
            currency: item.price?.currency || 'CZK',
            vatRate: item.price?.vatRate ?? '',
          }
        : emptyForm
    );
  }, [open, item]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim() || form.price === '' || !form.currency.trim()) {
      setError('Kód, název, cena a měna jsou povinné.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        categoryId: form.categoryId || null,
        price: Number(form.price),
        vatRate: form.vatRate === '' ? null : Number(form.vatRate),
      };
      const { data } = item
        ? await client.put(`/items/${item.id}`, payload)
        : await client.post('/items', payload);
      onSaved(data);
      onClose();
    } catch {
      setError('Uložení položky se nezdařilo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{item ? 'Upravit položku' : 'Nová položka'}</DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <TextField label="Kód" value={form.code} onChange={set('code')} required fullWidth />
          </Grid>
          <Grid item xs={12} sm={8}>
            <TextField label="Název" value={form.name} onChange={set('name')} required fullWidth />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Popis"
              value={form.description}
              onChange={set('description')}
              fullWidth
              multiline
              minRows={2}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField select label="Typ" value={form.itemType} onChange={set('itemType')} fullWidth>
              <MenuItem value="GOODS">Zboží</MenuItem>
              <MenuItem value="SERVICE">Služba</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={8}>
            <TextField
              select
              label="Kategorie"
              value={form.categoryId}
              onChange={set('categoryId')}
              fullWidth
            >
              <MenuItem value="">— bez kategorie —</MenuItem>
              {categories.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {'\u00A0'.repeat(c.level * 3)}
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField label="Jednotka" value={form.unit} onChange={set('unit')} fullWidth />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Cena"
              type="number"
              value={form.price}
              onChange={set('price')}
              required
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField label="Měna" value={form.currency} onChange={set('currency')} required fullWidth />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Sazba DPH (%)"
              type="number"
              value={form.vatRate}
              onChange={set('vatRate')}
              fullWidth
            />
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
