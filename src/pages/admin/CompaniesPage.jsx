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
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import client from '../../api/client';
import CompanyFormDialog from '../../components/CompanyFormDialog';
import { useCompany } from '../../company/CompanyContext';

/**
 * Administration of own companies (owner only): create, edit, soft delete
 * and marking one company as the default one.
 */
export default function CompaniesPage() {
  const { reload: reloadCompanyContext } = useCompany();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snack, setSnack] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    client
      .get('/companies')
      .then((res) => setCompanies(res.data))
      .catch(() => setError('Nepodařilo se načíst společnosti.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const afterChange = (message) => {
    setSnack(message);
    load();
    reloadCompanyContext();
  };

  const setDefault = async (company) => {
    try {
      await client.post(`/companies/${company.id}/default`);
      afterChange(`Společnost ${company.name} je nyní výchozí.`);
    } catch {
      setError('Nastavení výchozí společnosti se nezdařilo.');
    }
  };

  const handleDelete = async () => {
    try {
      await client.delete(`/companies/${deleting.id}`);
      afterChange('Společnost byla smazána.');
    } catch {
      setError('Smazání společnosti se nezdařilo.');
    } finally {
      setDeleting(null);
    }
  };

  const formatAddress = (a) =>
    a ? [a.street, a.houseNumber, a.city].filter(Boolean).join(' ') || '—' : '—';

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          Společnosti
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          Nová společnost
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {companies.length === 0 && !loading && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Zatím není založena žádná společnost. Pro práci s aplikací je třeba společnost založit.
        </Alert>
      )}

      <TableContainer component={Paper}>
        {loading && <LinearProgress />}
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Název</TableCell>
              <TableCell>IČO</TableCell>
              <TableCell>DIČ</TableCell>
              <TableCell>Adresa</TableCell>
              <TableCell>E-mail</TableCell>
              <TableCell>Stav</TableCell>
              <TableCell align="right">Akce</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {companies.map((c) => (
              <TableRow key={c.id} hover>
                <TableCell>
                  {c.name}
                  {c.defaultCompany && (
                    <Chip size="small" color="warning" label="Výchozí" sx={{ ml: 1 }} />
                  )}
                </TableCell>
                <TableCell>{c.registrationId || '—'}</TableCell>
                <TableCell>{c.vatId || '—'}</TableCell>
                <TableCell>{formatAddress(c.address)}</TableCell>
                <TableCell>{c.email || '—'}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={c.active !== false ? 'Aktivní' : 'Neaktivní'}
                    color={c.active !== false ? 'success' : 'default'}
                  />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title={c.defaultCompany ? 'Výchozí společnost' : 'Nastavit jako výchozí'}>
                    <span>
                      <IconButton
                        size="small"
                        disabled={c.defaultCompany}
                        onClick={() => setDefault(c)}
                      >
                        {c.defaultCompany ? (
                          <StarIcon fontSize="small" color="warning" />
                        ) : (
                          <StarBorderIcon fontSize="small" />
                        )}
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Upravit">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setEditing(c);
                        setFormOpen(true);
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Smazat">
                    <IconButton size="small" onClick={() => setDeleting(c)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {companies.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    Žádné společnosti.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <CompanyFormDialog
        open={formOpen}
        company={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => afterChange('Společnost byla uložena.')}
      />

      <Dialog open={!!deleting} onClose={() => setDeleting(null)}>
        <DialogTitle>Smazat společnost?</DialogTitle>
        <DialogContent>
          <Typography>
            Opravdu chcete smazat společnost <strong>{deleting?.name}</strong>?
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
        autoHideDuration={4000}
        onClose={() => setSnack('')}
        message={snack}
      />
    </Box>
  );
}
