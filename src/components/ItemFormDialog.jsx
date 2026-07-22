import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
  MenuItem,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import client from '../api/client';
import { useCompany } from '../company/CompanyContext';

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;

const VAT_TYPE_LABELS = {
  BASE: 'Základní',
  REDUCED_1: 'Snížená 1',
  REDUCED_2: 'Snížená 2',
  REDUCED_3: 'Snížená 3',
  ZERO: 'Nulová',
};

const emptyForm = {
  code: '',
  name: '',
  description: '',
  itemType: 'GOODS',
  categoryId: '',
  unit: '',
  active: true,
  price: '',
  purchasePriceNet: '',
  currency: 'CZK',
  vatRate: '',
};

/**
 * Create / edit dialog of a catalogue item including its current price.
 * `categories` is the flattened category tree (with `level`) used for the select box.
 * The VAT rate is picked from the rates currently valid for the country of the
 * active company; an image (PNG/JPEG/GIF/WebP, max 2 MB) can be uploaded for goods.
 */
export default function ItemFormDialog({ open, item, categories, onClose, onSaved }) {
  const { activeCompany } = useCompany() || {};
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [vatRates, setVatRates] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [imageRemoved, setImageRemoved] = useState(false);

  const companyCountry = activeCompany?.address?.countryIsoCode || 'CZ';

  // Load the VAT rates valid today for the country of the active company.
  useEffect(() => {
    if (!open) return;
    client
      .get('/vat-rates')
      .then((res) => {
        const now = new Date();
        const current = (res.data || []).filter(
          (r) =>
            r.countryIsoCode === companyCountry &&
            (!r.validFrom || new Date(r.validFrom) <= now) &&
            (!r.validTo || new Date(r.validTo) >= now)
        );
        setVatRates(current);
      })
      .catch(() => setVatRates([]));
  }, [open, companyCountry]);

  // Load the current image of the edited item for the preview.
  useEffect(() => {
    if (!open) return;
    setImageFile(null);
    setImageRemoved(false);
    setImagePreview('');
    if (!item || !item.hasImage) return;
    let url = '';
    client
      .get(`/items/${item.id}/image`, { responseType: 'blob' })
      .then((res) => {
        url = URL.createObjectURL(res.data);
        setImagePreview(url);
      })
      .catch(() => {});
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [open, item]);

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
            purchasePriceNet: item.price?.purchasePriceNet ?? '',
            currency: item.price?.currency || 'CZK',
            vatRate: item.price?.vatRate ?? '',
          }
        : emptyForm
    );
  }, [open, item]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  // Offered VAT rates; the current value of the item is kept selectable even
  // when it no longer matches any currently valid rate.
  const vatOptions = useMemo(() => {
    const options = vatRates.map((r) => ({
      value: String(r.rate),
      label: `${r.rate} % — ${VAT_TYPE_LABELS[r.type] || r.type}`,
    }));
    if (form.vatRate !== '' && !options.some((o) => o.value === String(form.vatRate))) {
      options.push({ value: String(form.vatRate), label: `${form.vatRate} %` });
    }
    return options;
  }, [vatRates, form.vatRate]);

  const handleImageSelect = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError('Obrázek musí být PNG, JPEG, GIF nebo WebP.');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setError('Obrázek může mít maximálně 2 MB.');
      return;
    }
    setError('');
    setImageFile(file);
    setImageRemoved(false);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleImageRemove = () => {
    setImageFile(null);
    setImagePreview('');
    setImageRemoved(true);
  };

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
        purchasePriceNet: form.purchasePriceNet === '' ? null : Number(form.purchasePriceNet),
        vatRate: form.vatRate === '' ? null : Number(form.vatRate),
      };
      let { data } = item
        ? await client.put(`/items/${item.id}`, payload)
        : await client.post('/items', payload);
      try {
        if (imageFile) {
          const formData = new FormData();
          formData.append('file', imageFile);
          ({ data } = await client.put(`/items/${data.id}/image`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          }));
        } else if (imageRemoved && item && item.hasImage) {
          await client.delete(`/items/${data.id}/image`);
          data = { ...data, hasImage: false };
        }
      } catch {
        setError('Položka byla uložena, ale změna obrázku se nezdařila.');
        onSaved(data);
        return;
      }
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
            <TextField
              label="Nákupní cena bez DPH"
              type="number"
              value={form.purchasePriceNet}
              onChange={set('purchasePriceNet')}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField label="Měna" value={form.currency} onChange={set('currency')} required fullWidth />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              select
              label="Sazba DPH (%)"
              value={form.vatRate === '' ? '' : String(form.vatRate)}
              onChange={set('vatRate')}
              fullWidth
              helperText={`Platné sazby pro zemi ${companyCountry}`}
            >
              <MenuItem value="">— bez DPH —</MenuItem>
              {vatOptions.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
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
            <Divider>
              <Typography variant="caption" color="text.secondary">
                Obrázek zboží
              </Typography>
            </Divider>
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {imagePreview ? (
                <Box
                  component="img"
                  src={imagePreview}
                  alt="Obrázek zboží"
                  sx={{
                    maxHeight: 96,
                    maxWidth: 160,
                    objectFit: 'contain',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    p: 0.5,
                  }}
                />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Žádný obrázek
                </Typography>
              )}
              <Button component="label" size="small" startIcon={<UploadFileIcon />}>
                Nahrát obrázek
                <input
                  type="file"
                  hidden
                  accept={ALLOWED_IMAGE_TYPES.join(',')}
                  onChange={handleImageSelect}
                />
              </Button>
              {imagePreview && (
                <Button
                  size="small"
                  color="error"
                  startIcon={<DeleteOutlineIcon />}
                  onClick={handleImageRemove}
                >
                  Odebrat
                </Button>
              )}
              <Typography variant="caption" color="text.secondary">
                PNG, JPEG, GIF nebo WebP, max. 2 MB
              </Typography>
            </Box>
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
