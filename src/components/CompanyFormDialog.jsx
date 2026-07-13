import { useEffect, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
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
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import client from '../api/client';

const ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'];
const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024;

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
  nameSecondLine: '',
  registrationId: '',
  vatId: '',
  address: { ...emptyAddress },
  registrationNote: '',
  registrationNoteEn: '',
  phone: '',
  email: '',
  website: '',
  bankAccount: '',
  bankName: '',
  iban: '',
  bic: '',
  active: true,
  defaultCompany: false,
};

/**
 * Create / edit own company dialog with ARES lookup: after entering the registration id (IČO)
 * the "ARES" button fills in name, VAT id and address (including the orientation number) from
 * the registry. The logo can be uploaded (PNG/JPEG/GIF/WebP/SVG, max 2 MB) or removed; the file
 * is sent to the logo endpoint after the company itself is saved.
 */
export default function CompanyFormDialog({ open, company, onClose, onSaved }) {
  const [form, setForm] = useState(emptyForm);
  const [countries, setCountries] = useState([]);
  const [error, setError] = useState('');
  const [aresLoading, setAresLoading] = useState(false);
  const [aresInfo, setAresInfo] = useState('');
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [logoRemoved, setLogoRemoved] = useState(false);

  useEffect(() => {
    if (!open) return;
    client
      .get('/countries')
      .then((res) => setCountries(res.data))
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setError('');
    setAresInfo('');
    if (company) {
      setForm({
        name: company.name || '',
        nameSecondLine: company.nameSecondLine || '',
        registrationId: company.registrationId || '',
        vatId: company.vatId || '',
        address: { ...emptyAddress, ...(company.address || {}) },
        registrationNote: company.registrationNote || '',
        registrationNoteEn: company.registrationNoteEn || '',
        phone: company.phone || '',
        email: company.email || '',
        website: company.website || '',
        bankAccount: company.bankAccount || '',
        bankName: company.bankName || '',
        iban: company.iban || '',
        bic: company.bic || '',
        active: company.active !== false,
        defaultCompany: !!company.defaultCompany,
      });
    } else {
      setForm({ ...emptyForm, address: { ...emptyAddress } });
    }
  }, [open, company]);

  useEffect(() => {
    if (!open) return;
    setLogoFile(null);
    setLogoRemoved(false);
    setLogoPreview('');
    if (!company || !company.hasLogo) return;
    let url = '';
    client
      .get(`/companies/${company.id}/logo`, { responseType: 'blob' })
      .then((res) => {
        url = URL.createObjectURL(res.data);
        setLogoPreview(url);
      })
      .catch(() => {});
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [open, company]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const setAddr = (field) => (e) =>
    setForm((f) => ({ ...f, address: { ...f.address, [field]: e.target.value } }));

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
        address: data.address ? { ...emptyAddress, ...data.address } : f.address,
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

  const handleLogoSelect = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      setError('Logo musí být obrázek PNG, JPEG, GIF, WebP nebo SVG.');
      return;
    }
    if (file.size > MAX_LOGO_SIZE_BYTES) {
      setError('Logo může mít maximálně 2 MB.');
      return;
    }
    setError('');
    setLogoFile(file);
    setLogoRemoved(false);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleLogoRemove = () => {
    setLogoFile(null);
    setLogoPreview('');
    setLogoRemoved(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.registrationId.trim()) {
      setError('Název a IČO jsou povinné.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      let { data } = company
        ? await client.put(`/companies/${company.id}`, form)
        : await client.post('/companies', form);
      try {
        if (logoFile) {
          const formData = new FormData();
          formData.append('file', logoFile);
          ({ data } = await client.put(`/companies/${data.id}/logo`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          }));
        } else if (logoRemoved && company && company.hasLogo) {
          await client.delete(`/companies/${data.id}/logo`);
          data = { ...data, hasLogo: false };
        }
      } catch (e) {
        setError('Společnost byla uložena, ale změna loga se nezdařila.');
        onSaved(data);
        return;
      }
      onSaved(data);
      onClose();
    } catch (e) {
      setError('Uložení společnosti se nezdařilo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{company ? 'Upravit společnost' : 'Nová společnost'}</DialogTitle>
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
          <Grid item xs={12} sm={6}>
            <TextField label="Název" value={form.name} onChange={set('name')} required fullWidth />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Název — druhý řádek"
              value={form.nameSecondLine}
              onChange={set('nameSecondLine')}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField label="E-mail" value={form.email} onChange={set('email')} fullWidth />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField label="Telefon" value={form.phone} onChange={set('phone')} fullWidth />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField label="Web" value={form.website} onChange={set('website')} fullWidth />
          </Grid>

          <Grid item xs={12}>
            <Divider>
              <Typography variant="caption" color="text.secondary">
                Adresa sídla
              </Typography>
            </Divider>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Ulice"
              value={form.address.street}
              onChange={setAddr('street')}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              label="Číslo popisné"
              value={form.address.houseNumber}
              onChange={setAddr('houseNumber')}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              label="Číslo orientační"
              value={form.address.streetNumber}
              onChange={setAddr('streetNumber')}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={5}>
            <TextField
              label="Město"
              value={form.address.city}
              onChange={setAddr('city')}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              label="PSČ"
              value={form.address.zipCode}
              onChange={setAddr('zipCode')}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Autocomplete
              options={countries}
              getOptionLabel={(c) => `${c.isoCode} — ${c.name}`}
              isOptionEqualToValue={(o, v) => o.isoCode === v.isoCode}
              value={
                countries.find((c) => c.isoCode === form.address.countryIsoCode) ||
                (form.address.countryIsoCode
                  ? { isoCode: form.address.countryIsoCode, name: form.address.countryName || '' }
                  : null)
              }
              onChange={(e, value) =>
                setForm((f) => ({
                  ...f,
                  address: {
                    ...f.address,
                    countryIsoCode: value ? value.isoCode : '',
                    countryName: value ? value.name : '',
                  },
                }))
              }
              renderInput={(params) => <TextField {...params} label="Země" fullWidth />}
            />
          </Grid>

          <Grid item xs={12}>
            <Divider>
              <Typography variant="caption" color="text.secondary">
                Bankovní spojení
              </Typography>
            </Divider>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Číslo účtu"
              value={form.bankAccount}
              onChange={set('bankAccount')}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Banka"
              value={form.bankName}
              onChange={set('bankName')}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={8}>
            <TextField label="IBAN" value={form.iban} onChange={set('iban')} fullWidth />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField label="BIC / SWIFT" value={form.bic} onChange={set('bic')} fullWidth />
          </Grid>

          <Grid item xs={12}>
            <Divider>
              <Typography variant="caption" color="text.secondary">
                Registrační doložka
              </Typography>
            </Divider>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Doložka (CZ)"
              value={form.registrationNote}
              onChange={set('registrationNote')}
              fullWidth
              multiline
              minRows={2}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Doložka (EN)"
              value={form.registrationNoteEn}
              onChange={set('registrationNoteEn')}
              fullWidth
              multiline
              minRows={2}
            />
          </Grid>

          <Grid item xs={12}>
            <Divider>
              <Typography variant="caption" color="text.secondary">
                Logo
              </Typography>
            </Divider>
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {logoPreview ? (
                <Box
                  component="img"
                  src={logoPreview}
                  alt="Logo společnosti"
                  sx={{
                    maxHeight: 64,
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
                  Žádné logo
                </Typography>
              )}
              <Button component="label" size="small" startIcon={<UploadFileIcon />}>
                Nahrát logo
                <input
                  type="file"
                  hidden
                  accept={ALLOWED_LOGO_TYPES.join(',')}
                  onChange={handleLogoSelect}
                />
              </Button>
              {logoPreview && (
                <Button
                  size="small"
                  color="error"
                  startIcon={<DeleteOutlineIcon />}
                  onClick={handleLogoRemove}
                >
                  Odebrat
                </Button>
              )}
              <Typography variant="caption" color="text.secondary">
                PNG, JPEG, GIF, WebP nebo SVG, max. 2 MB
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
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
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={form.defaultCompany}
                  onChange={(e) => setForm((f) => ({ ...f, defaultCompany: e.target.checked }))}
                />
              }
              label="Výchozí společnost"
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
