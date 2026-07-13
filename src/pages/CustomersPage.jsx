import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  Paper,
  Snackbar,
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
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import BlockIcon from '@mui/icons-material/Block';
import client from '../api/client';
import { useAuth } from '../auth/AuthContext';
import CustomerFormDialog from '../components/CustomerFormDialog';

export default function CustomersPage() {
  const navigate = useNavigate();
  const { isOwner } = useAuth();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [snack, setSnack] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(() => {
    const params = { page, size, sort: 'name,asc' };
    if (search.trim()) params.name = search.trim();
    client
      .get('/customers', { params })
      .then((res) => {
        setRows(res.data.content || []);
        setTotal(res.data.totalElements ?? 0);
      })
      .catch(() => setError('Nepodařilo se načíst zákazníky.'));
  }, [page, size, search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const handleDeactivate = async (customer) => {
    if (!window.confirm(`Opravdu deaktivovat zákazníka „${customer.name}“?`)) return;
    try {
      await client.delete(`/customers/${customer.id}`);
      setSnack('Zákazník byl deaktivován.');
      load();
    } catch {
      setError('Deaktivace se nezdařila.');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          Zákazníci
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          Nový zákazník
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 2 }}>
        <TextField
          size="small"
          placeholder="Hledat podle názvu…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ width: 320 }}
        />
      </Paper>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Název</TableCell>
              <TableCell>IČO</TableCell>
              <TableCell>Město</TableCell>
              <TableCell>E-mail</TableCell>
              <TableCell>Obchodní zástupce</TableCell>
              <TableCell>Stav</TableCell>
              <TableCell align="right">Akce</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((c) => (
              <TableRow
                key={c.id}
                hover
                sx={{ cursor: 'pointer' }}
                onClick={() => navigate(`/customers/${c.id}`)}
              >
                <TableCell>{c.name}</TableCell>
                <TableCell>{c.registrationId}</TableCell>
                <TableCell>{c.headquartersAddress?.city || '—'}</TableCell>
                <TableCell>{c.email || '—'}</TableCell>
                <TableCell>{c.salesRepresentativeName || '—'}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={c.active ? 'Aktivní' : 'Neaktivní'}
                    color={c.active ? 'success' : 'default'}
                  />
                </TableCell>
                <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                  <Tooltip title="Upravit">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setEditing(c);
                        setDialogOpen(true);
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {isOwner && c.active && (
                    <Tooltip title="Deaktivovat">
                      <IconButton size="small" onClick={() => handleDeactivate(c)}>
                        <BlockIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    Žádní zákazníci nenalezeni.
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

      <CustomerFormDialog
        open={dialogOpen}
        customer={editing}
        onClose={() => setDialogOpen(false)}
        onSaved={() => {
          setSnack('Zákazník byl uložen.');
          load();
        }}
      />

      <Snackbar
        open={!!snack}
        autoHideDuration={4000}
        onClose={() => setSnack('')}
        message={snack}
      />
    </Box>
  );
}
