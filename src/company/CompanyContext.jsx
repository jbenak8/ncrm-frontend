import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import client from '../api/client';
import { useAuth } from '../auth/AuthContext';

// Holds the list of own companies and the currently active one. Companies are
// manageable only by the owner (administrator); sales representatives can also
// list and select among the companies they are assigned to (the backend scopes
// the list accordingly). Customers cannot switch companies, but the company
// they are assigned to is loaded and preselected automatically so they can
// create orders for it.
const CompanyContext = createContext(null);

const STORAGE_KEY = 'ncrm-active-company';

export function CompanyProvider({ children }) {
  const { isOwner, isSalesRep, isCustomer } = useAuth();
  const companySelectionAvailable = isOwner || isSalesRep;
  // Customers also load their (single) assigned company, they just cannot switch it.
  const companiesAvailable = companySelectionAvailable || isCustomer;
  const [companies, setCompanies] = useState([]);
  const [activeCompanyId, setActiveCompanyId] = useState(
    () => sessionStorage.getItem(STORAGE_KEY) || null
  );
  const [loading, setLoading] = useState(companiesAvailable);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    if (!companiesAvailable) {
      setLoading(false);
      return [];
    }
    setLoading(true);
    setError('');
    try {
      const { data } = await client.get('/companies');
      setCompanies(data);
      return data;
    } catch {
      setError('Nepodařilo se načíst seznam společností.');
      return [];
    } finally {
      setLoading(false);
    }
  }, [companiesAvailable]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Resolve the active company: explicit selection wins, then the default company.
  // A customer is assigned to a single company by the backend, so it is
  // preselected automatically even when not marked as default.
  useEffect(() => {
    if (!companiesAvailable || loading) return;
    if (activeCompanyId && companies.some((c) => c.id === activeCompanyId)) return;
    const defaultCompany =
      companies.find((c) => c.defaultCompany) || (isCustomer ? companies[0] : null);
    if (defaultCompany) {
      setActiveCompanyId(defaultCompany.id);
      sessionStorage.setItem(STORAGE_KEY, defaultCompany.id);
    } else if (activeCompanyId) {
      setActiveCompanyId(null);
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, [companiesAvailable, isCustomer, loading, companies, activeCompanyId]);

  const selectCompany = useCallback((companyId) => {
    setActiveCompanyId(companyId);
    if (companyId) {
      sessionStorage.setItem(STORAGE_KEY, companyId);
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const value = useMemo(() => {
    const activeCompany = companies.find((c) => c.id === activeCompanyId) || null;
    const activeCompanies = companies.filter((c) => c.active !== false);
    return {
      // Company switching is available to the owner (administrator) and to sales
      // representatives (limited to their assigned companies by the backend).
      companySelectionAvailable,
      companies,
      activeCompanies,
      activeCompany,
      // True when the owner has to pick a company manually (no default one set).
      needsSelection: companySelectionAvailable && !loading && companies.length > 0 && !activeCompany,
      // True when no company exists yet and one has to be created first.
      noCompanyExists: isOwner && !loading && companies.length === 0,
      loading,
      error,
      selectCompany,
      reload,
    };
  }, [companySelectionAvailable, isOwner, companies, activeCompanyId, loading, error, selectCompany, reload]);

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}

export function useCompany() {
  return useContext(CompanyContext);
}
