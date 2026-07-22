import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import client from '../api/client';
import SearchFilterBar from './SearchFilterBar';
import { formatMoney } from '../utils/format';

function flattenCategories(categories, level = 0) {
  return (categories || []).flatMap((c) => [
    { ...c, level },
    ...flattenCategories(c.children, level + 1),
  ]);
}

/**
 * Read-only preview of the catalogue item card including its image, shown in a
 * separate dialog on top of the item picker.
 */
function ItemPreviewDialog({ item, onClose }) {
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    setImageUrl('');
    if (!item || !item.hasImage) return;
    let url = '';
    client
      .get(`/items/${item.id}/image`, { responseType: 'blob' })
      .then((res) => {
        url = URL.createObjectURL(res.data);
        setImageUrl(url);
      })
      .catch(() => {});
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [item]);

  return (
    <Dialog open={!!item} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Karta zboží {item?.code}</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid item xs={12} sx={{ textAlign: 'center' }}>
            {imageUrl ? (
              <Box
                component="img"
                src={imageUrl}
                alt={item?.name}
                sx={{
                  maxHeight: 240,
                  maxWidth: '100%',
                  objectFit: 'contain',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  p: 0.5,
                }}
              />
            ) : (
              <Typography variant="body2" color="text.secondary">
                {item?.hasImage ? 'Načítám obrázek…' : 'Žádný obrázek'}
              </Typography>
            )}
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Název
            </Typography>
            <Typography>{item?.name}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Typ
            </Typography>
            <Typography>{item?.itemType === 'SERVICE' ? 'Služba' : 'Zboží'}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Kategorie
            </Typography>
            <Typography>{item?.categoryName || '—'}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Jednotka
            </Typography>
            <Typography>{item?.unit || '—'}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Cena
            </Typography>
            <Typography>
              {item?.price ? formatMoney(item.price.price, item.price.currency) : '—'}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Sazba DPH
            </Typography>
            <Typography>{item?.price?.vatRate != null ? `${item.price.vatRate} %` : '—'}</Typography>
          </Grid>
          {item?.description && (
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                Popis
              </Typography>
              <Typography>{item.description}</Typography>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Zavřít</Button>
      </DialogActions>
    </Dialog>
  );
}

/**
 * Dialog for searching the item catalogue by any criterion (including the
 * category) and picking several items at once. The selected items are passed
 * to the parent via `onAdd(items)`; each row also offers a read-only preview
 * of the item card including its image.
 *
 * Props:
 *  - open: whether the dialog is shown
 *  - onClose(): close callback
 *  - onAdd(items): called with the array of selected item objects
 */
export default function ItemPickerDialog({ open, onClose, onAdd }) {
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState([]);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState({});
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (!open) return;
    setFilters([]);
    setPage(0);
    setSelected({});
    client
      .get('/items/categories')
      .then((res) => setCategories(flattenCategories(res.data)))
      .catch(() => setCategories([]));
  }, [open]);

  // Fields of the generic item search API (filter=field:operator:value),
  // including the category taken from the flattened category tree.
  const searchFields = useMemo(
    () => [
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
      {
        name: 'category.id',
        label: 'Kategorie',
        type: 'enum',
        options: categories.map((c) => ({
          value: c.id,
          label: `${'\u00A0'.repeat(c.level * 3)}${c.name}`,
        })),
      },
      { name: 'unit', label: 'Jednotka', type: 'text' },
      { name: 'price.price', label: 'Cena', type: 'number' },
      { name: 'price.vatRate', label: 'Sazba DPH', type: 'number' },
    ],
    [categories]
  );

  const load = useCallback(() => {
    if (!open) return;
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', page);
    params.set('size', size);
    params.set('sort', 'name,asc');
    // Only active items can be added to an order.
    params.append('filter', 'active:eq:true');
    filters.forEach((f) => params.append('filter', f));
    client
      .get('/items/search', { params })
      .then((res) => {
        setItems(res.data.content || []);
        setTotal(res.data.totalElements ?? 0);
      })
      .catch(() => {
        setItems([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [open, page, size, filters]);

  useEffect(load, [load]);

  const toggle = (item) =>
    setSelected((s) => {
      const next = { ...s };
      if (next[item.id]) delete next[item.id];
      else next[item.id] = item;
      return next;
    });

  const selectedItems = Object.values(selected);

  const handleAdd = () => {
    onAdd(selectedItems);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Vyhledat zboží</DialogTitle>
      <DialogContent dividers>
        <SearchFilterBar
          fields={searchFields}
          filters={filters}
          onChange={(next) => {
            setFilters(next);
            setPage(0);
          }}
        />
        {loading && <LinearProgress />}
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" />
              <TableCell>Kód</TableCell>
              <TableCell>Název</TableCell>
              <TableCell>Kategorie</TableCell>
              <TableCell align="right">Cena</TableCell>
              <TableCell align="right">Náhled</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((i) => (
              <TableRow key={i.id} hover onClick={() => toggle(i)} sx={{ cursor: 'pointer' }}>
                <TableCell padding="checkbox">
                  <Checkbox size="small" checked={!!selected[i.id]} />
                </TableCell>
                <TableCell>{i.code}</TableCell>
                <TableCell>{i.name}</TableCell>
                <TableCell>{i.categoryName || '—'}</TableCell>
                <TableCell align="right">
                  {i.price ? formatMoney(i.price.price, i.price.currency) : '—'}
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Náhled karty zboží">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreview(i);
                      }}
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={6} align="center">
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
          rowsPerPageOptions={[5, 10, 25]}
          labelRowsPerPage="Řádků na stránku:"
        />
        {selectedItems.length > 0 && (
          <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {selectedItems.map((i) => (
              <Chip
                key={i.id}
                size="small"
                label={`${i.code} — ${i.name}`}
                onDelete={() => toggle(i)}
              />
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Zrušit</Button>
        <Button variant="contained" onClick={handleAdd} disabled={selectedItems.length === 0}>
          Přidat vybrané ({selectedItems.length})
        </Button>
      </DialogActions>
      <ItemPreviewDialog item={preview} onClose={() => setPreview(null)} />
    </Dialog>
  );
}
