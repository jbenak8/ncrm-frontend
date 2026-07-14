import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  LinearProgress,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import client from '../api/client';
import SearchFilterBar from '../components/SearchFilterBar';
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
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  const [filters, setFilters] = useState([]);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    client
      .get('/items/categories')
      .then((res) => setCategories(flattenCategories(res.data)))
      .catch(() => setCategories([]));
  }, []);

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

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          Katalog položek
        </Typography>
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
              </TableRow>
            ))}
            {items.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={8} align="center">
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
    </Box>
  );
}
