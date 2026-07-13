import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import client from '../api/client';
import { formatMoney } from '../utils/format';

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
  const [error, setError] = useState('');

  useEffect(() => {
    client
      .get('/items/categories')
      .then((res) => setCategories(flattenCategories(res.data)))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    const url = categoryId ? `/items/by-category/${categoryId}` : '/items';
    client
      .get(url)
      .then((res) => setItems(res.data))
      .catch(() => setError('Nepodařilo se načíst položky.'));
  }, [categoryId]);

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
          onChange={(e) => setCategoryId(e.target.value)}
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

      <TableContainer component={Paper}>
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
            {items.length === 0 && (
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
      </TableContainer>
    </Box>
  );
}
