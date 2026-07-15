import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import client from '../api/client';

const emptyForm = {
  code: '',
  name: '',
  description: '',
  parentId: '',
  sortOrder: 0,
  active: true,
};

/**
 * Administration dialog of the item category tree: create, edit and delete categories.
 * Deleting a category that still contains items requires an explicit confirmation; the
 * assigned items are then deleted, or only deactivated when referenced by orders.
 * `categories` is the flattened category tree (with `level`); `onChanged` reloads the data.
 */
export default function CategoryManagerDialog({ open, categories, onClose, onChanged }) {
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteWarning, setDeleteWarning] = useState(null);

  useEffect(() => {
    if (open) {
      setError('');
      setInfo('');
    }
  }, [open]);

  const openForm = (category) => {
    setEditing(category || null);
    setForm(
      category
        ? {
            code: category.code || '',
            name: category.name || '',
            description: category.description || '',
            parentId: category.parentId || '',
            sortOrder: category.sortOrder ?? 0,
            active: category.active !== false,
          }
        : emptyForm
    );
    setFormError('');
    setFormOpen(true);
  };

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      setFormError('Kód a název jsou povinné.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        ...form,
        parentId: form.parentId || null,
        sortOrder: Number(form.sortOrder) || 0,
      };
      if (editing) {
        await client.put(`/items/categories/${editing.id}`, payload);
      } else {
        await client.post('/items/categories', payload);
      }
      setInfo('Kategorie byla uložena.');
      setFormOpen(false);
      onChanged();
    } catch {
      setFormError('Uložení kategorie se nezdařilo.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (category, force) => {
    try {
      const { data } = await client.delete(`/items/categories/${category.id}`, {
        params: force ? { force: true } : undefined,
      });
      if (data.requiresConfirmation) {
        // Category still contains items – ask the user before deleting them too.
        setDeleteWarning({ category, affectedItems: data.affectedItems });
        return;
      }
      setDeleteWarning(null);
      setDeleting(null);
      setInfo(
        data.deactivatedItems > 0
          ? `Kategorie byla smazána. Smazáno položek: ${data.deletedItems}, zneaktivněno (vazba na objednávky): ${data.deactivatedItems}.`
          : 'Kategorie byla smazána.'
      );
      onChanged();
    } catch {
      setError('Smazání kategorie se nezdařilo.');
      setDeleteWarning(null);
      setDeleting(null);
    }
  };

  // Parents offered when editing: the category itself and its subtree are excluded.
  const parentOptions = (current) =>
    categories.filter(
      (c) =>
        !current ||
        (c.id !== current.id && !(c.path || '').startsWith(`${current.path}.`))
    );

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Kategorie položek
          <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => openForm(null)}>
            Nová kategorie
          </Button>
        </DialogTitle>
        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          {info && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setInfo('')}>
              {info}
            </Alert>
          )}
          <List dense>
            {categories.map((c) => (
              <ListItem
                key={c.id}
                sx={{ pl: 2 + c.level * 3 }}
                secondaryAction={
                  <Box>
                    <Tooltip title="Upravit">
                      <IconButton size="small" onClick={() => openForm(c)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Smazat">
                      <IconButton size="small" onClick={() => setDeleting(c)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                }
              >
                <ListItemText
                  primary={
                    <>
                      {c.name}{' '}
                      <Chip size="small" label={c.code} sx={{ ml: 0.5 }} />
                      {c.active === false && (
                        <Chip size="small" label="Neaktivní" sx={{ ml: 0.5 }} />
                      )}
                    </>
                  }
                  secondary={c.description || null}
                />
              </ListItem>
            ))}
            {categories.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                Žádné kategorie.
              </Typography>
            )}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Zavřít</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Upravit kategorii' : 'Nová kategorie'}</DialogTitle>
        <DialogContent dividers>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
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
            <Grid item xs={12} sm={8}>
              <TextField
                select
                label="Nadřazená kategorie"
                value={form.parentId}
                onChange={set('parentId')}
                fullWidth
              >
                <MenuItem value="">— žádná (kořenová) —</MenuItem>
                {parentOptions(editing).map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {'\u00A0'.repeat(c.level * 3)}
                    {c.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Pořadí"
                type="number"
                value={form.sortOrder}
                onChange={set('sortOrder')}
                fullWidth
              />
            </Grid>
            <Grid item xs={12}>
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
          <Button onClick={() => setFormOpen(false)}>Zrušit</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Ukládám…' : 'Uložit'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleting && !deleteWarning} onClose={() => setDeleting(null)}>
        <DialogTitle>Smazat kategorii?</DialogTitle>
        <DialogContent>
          <Typography>
            Opravdu chcete smazat kategorii <strong>{deleting?.name}</strong> včetně jejích
            podkategorií?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleting(null)}>Zrušit</Button>
          <Button color="error" variant="contained" onClick={() => handleDelete(deleting, false)}>
            Smazat
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteWarning} onClose={() => setDeleteWarning(null)}>
        <DialogTitle>Kategorie obsahuje položky</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Ke kategorii <strong>{deleteWarning?.category?.name}</strong> (včetně podkategorií) je
            přiřazeno {deleteWarning?.affectedItems} položek, které budou také odstraněny. Položky
            použité v objednávkách nebudou smazány, pouze zneaktivněny.
          </Alert>
          <Typography>Chcete pokračovat?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteWarning(null)}>Zrušit</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => handleDelete(deleteWarning.category, true)}
          >
            Smazat včetně položek
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
