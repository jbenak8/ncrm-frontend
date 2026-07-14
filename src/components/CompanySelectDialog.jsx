import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import BusinessIcon from '@mui/icons-material/Business';
import StarIcon from '@mui/icons-material/Star';
import { useCompany } from '../company/CompanyContext';
import client from '../api/client';

/**
 * Shown right after login for the owner (administrator) when no company is
 * marked as default: the user has to pick which company to work with.
 * When no company exists at all, a warning with a link to the administration is shown.
 * Because a company address requires an existing country, an empty country list
 * is checked first and the owner is asked to add a country before the company.
 */
export default function CompanySelectDialog() {
  const { needsSelection, noCompanyExists, activeCompanies, companies, selectCompany } =
    useCompany();
  const navigate = useNavigate();
  const location = useLocation();
  // null = not checked yet, true/false = whether at least one country exists.
  const [hasCountries, setHasCountries] = useState(null);

  // The countries check is needed only when a company has to be created.
  useEffect(() => {
    if (!noCompanyExists) {
      setHasCountries(null);
      return;
    }
    let cancelled = false;
    client
      .get('/countries')
      .then(({ data }) => {
        // Defensive: the endpoint returns an array, but tolerate paged responses too,
        // so an unexpected shape never results in a false "no country" warning.
        const countries = Array.isArray(data) ? data : data?.content || [];
        if (!cancelled) setHasCountries(countries.length > 0);
      })
      .catch(() => {
        // On error do not block company creation with the countries warning.
        if (!cancelled) setHasCountries(true);
      });
    return () => {
      cancelled = true;
    };
  }, [noCompanyExists]);

  // Do not block any administration page (countries, companies, VAT rates,
  // sales representatives, users), otherwise basic data could never be managed
  // and the warning dialogs would wrongly pop up over these functions.
  if (location.pathname.startsWith('/admin') || location.pathname.startsWith('/users')) {
    return null;
  }

  if (noCompanyExists) {
    if (hasCountries === null) {
      return (
        <Dialog open maxWidth="xs" fullWidth>
          <DialogContent sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </DialogContent>
        </Dialog>
      );
    }
    if (!hasCountries) {
      return (
        <Dialog open maxWidth="xs" fullWidth>
          <DialogTitle>Žádná země</DialogTitle>
          <DialogContent>
            <Alert severity="warning">
              V systému zatím není evidována žádná země. Před založením společnosti je nejprve
              třeba přidat alespoň jednu zemi v administraci základních dat.
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button variant="contained" onClick={() => navigate('/admin/countries')}>
              Přidat zemi
            </Button>
          </DialogActions>
        </Dialog>
      );
    }
    return (
      <Dialog open maxWidth="xs" fullWidth>
        <DialogTitle>Žádná společnost</DialogTitle>
        <DialogContent>
          <Alert severity="warning">
            V systému zatím není založena žádná společnost. Nejprve je třeba společnost založit
            v administraci základních dat.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => navigate('/admin/companies')}>
            Založit společnost
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  if (!needsSelection) {
    return null;
  }

  const selectable = activeCompanies.length > 0 ? activeCompanies : companies;

  return (
    <Dialog open maxWidth="xs" fullWidth>
      <DialogTitle>Výběr společnosti</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 1 }}>
          Žádná společnost není označena jako výchozí. Vyberte společnost, se kterou chcete
          pracovat.
        </Alert>
        <List>
          {selectable.map((c) => (
            <ListItemButton key={c.id} onClick={() => selectCompany(c.id)}>
              <ListItemIcon>
                {c.defaultCompany ? <StarIcon color="warning" /> : <BusinessIcon />}
              </ListItemIcon>
              <ListItemText primary={c.name} secondary={c.registrationId} />
            </ListItemButton>
          ))}
        </List>
      </DialogContent>
    </Dialog>
  );
}
