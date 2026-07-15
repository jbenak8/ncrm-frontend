import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CategoryIcon from '@mui/icons-material/Category';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import client from '../api/client';
import SearchFilterBar from '../components/SearchFilterBar';
import ItemFormDialog from '../components/ItemFormDialog';
import CategoryManagerDialog from '../components/CategoryManagerDialog';
import { useAuth } from '../auth/AuthContext';
import { formatMoney } from '../utils/format';

// Fields of the generic item search API (filter=field:operator:value).
const SEARCH_FIELDS = [
  { name: 'code', label: 'Kód', type: 'text' },
  { name: 'name', label: 'Název', type: 'text' },
  { name: 'description', label: 'Popis', type: 'text' },
  {
    name: 'itemType',
    label: 'Typ',
    type: 'enum',
    options: [
      { value: 'GOODS', label: 'Zboží' },
      { value: 'SERVICE', label: 'Služba' },
    ],
  },
  { name: 'unit', label: 'Jednotka', type: 'text' },
  { name: 'price.price', label: 'Cena', type: 'number' },
  { name: 'price.vatRate', label: 'Sazba DPH', type: 'number' },
  { name: 'active', label: 'Aktivní', type: 'boolean' },
];

function flattenCategories(categories, level = 0) {
  return (categories || []).flatMap((c) => [
    { ...c, level },
    ...flattenCategories(c.children, level + 1),
  ]);
}

export default function ItemsPage() {
  const { isOwner } = useAuth();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  const [filters, setFilters] = useState([]);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snack, setSnack] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  const loadCategories = useCallback(() => {
    client
      .get('/items/categories')
      .then((res) => setCategories(flattenCategories(res.data)))
      .catch(() => setCategories([]));
  }, []);

  useEffect(loadCategories, [loadCategories]);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', page);
    params.set('size', size);
    params.set('sort', 'name,asc');
    filters.forEach((f) => params.append('filter', f));
    if (categoryId) params.append('filter', `category.id:eq:${categoryId}`);
    client
      .get('/items/search', { params })
      .then((res) => {
        setItems(res.data.content || []);
        setTotal(res.data.totalElements ?? 0);
      })
      .catch(() => setError('Nepodařilo se načíst položky.'))
      .finally(() => setLoading(false));
  }, [page, size, filters, categoryId]);

  useEffect(load, [load]);

  const openForm = (item) => {
    setEditing(item || null);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    try {
      const { data } = await client.delete(`/items/${deleting.id}`);
      setSnack(
        data.deactivated
          ? 'Položka je použita v objednávkách, proto byla pouze zneaktivněna.'
          : 'Položka byla smazána.'
      );
      load();
    } catch {
      setError('Smazání položky se nezdařilo.');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          Katalog položek
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            select
            size="small"
            label="Kategorie"
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setPage(0);
            }}
            sx={{ width: 280 }}
          >
            <MenuItem value="">Všechny kategorie</MenuItem>
            {categories.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {'\u00A0'.repeat(c.level * 3)}
                {c.name}
              </MenuItem>
            ))}
          </TextField>
          {isOwner && (
            <Button
              variant="outlined"
              startIcon={<CategoryIcon />}
              onClick={() => setCategoriesOpen(true)}
            >
              Kategorie
            </Button>
          )}
          {isOwner && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => openForm(null)}>
              Nová položka
            </Button>
          )}
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <SearchFilterBar
        fields={SEARCH_FIELDS}
        filters={filters}
        onChange={(next) => {
          setFilters(next);
          setPage(0);
        }}
      />

      <TableContainer component={Paper}>
        {loading && <LinearProgress />}
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Kód</TableCell>
              <TableCell>Název</TableCell>
              <TableCell>Typ</TableCell>
              <TableCell>Kategorie</TableCell>
              <TableCell>Jednotka</TableCell>
              <TableCell align="right">Cena</TableCell>
              <TableCell align="right">DPH</TableCell>
              <TableCell>Stav</TableCell>
              {isOwner && <TableCell align="right">Akce</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((i) => (
              <TableRow key={i.id} hover>
                <TableCell>{i.code}</TableCell>
                <TableCell>{i.name}</TableCell>
                <TableCell>{i.itemType === 'SERVICE' ? 'Služba' : 'Zboží'}</TableCell>
                <TableCell>{i.categoryName || '—'}</TableCell>
                <TableCell>{i.unit || '—'}</TableCell>
                <TableCell align="right">
                  {i.price ? formatMoney(i.price.price, i.price.currency) : '—'}
                </TableCell>
                <TableCell align="right">{i.price ? `${i.price.vatRate} %` : '—'}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={i.active !== false ? 'Aktivní' : 'Neaktivní'}
                    color={i.active !== false ? 'success' : 'default'}
                  />
                </TableCell>
                {isOwner && (
                  <TableCell align="right">
                    <Tooltip title="Upravit">
                      <IconButton size="small" onClick={() => openForm(i)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Smazat">
                      <IconButton size="small" onClick={() => setDeleting(i)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {items.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={isOwner ? 9 : 8} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    Žádné položky.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={size}
          onRowsPerPageChange={(e) => {
            setSize(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50]}
          labelRowsPerPage="Řádků na stránku:"
        />
      </TableContainer>

      <ItemFormDialog
        open={formOpen}
        item={editing}
        categories={categories}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setSnack('Položka byla uložena.');
          load();
        }}
      />

      <CategoryManagerDialog
        open={categoriesOpen}
        categories={categories}
        onClose={() => setCategoriesOpen(false)}
        onChanged={() => {
          loadCategories();
          load();
        }}
      />

      <Dialog open={!!deleting} onClose={() => setDeleting(null)}>
        <DialogTitle>Smazat položku?</DialogTitle>
        <DialogContent>
          <Typography>
            Opravdu chcete smazat položku <strong>{deleting?.name}</strong>? Pokud je položka
            použita v objednávkách, bude pouze zneaktivněna.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleting(null)}>Zrušit</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>
            Smazat
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!snack}
        autoHideDuration={5000}
        onClose={() => setSnack('')}
        message={snack}
      />
    </Box>
  );
}
