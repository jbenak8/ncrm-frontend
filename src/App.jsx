import { Navigate, Route, Routes } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from './auth/AuthContext';
import { CompanyProvider } from './company/CompanyContext';
import Layout from './components/Layout';
import CompanySelectDialog from './components/CompanySelectDialog';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CustomersPage from './pages/CustomersPage';
import CustomerDetailPage from './pages/CustomerDetailPage';
import OrdersPage from './pages/OrdersPage';
import MeetingsPage from './pages/MeetingsPage';
import CampaignsPage from './pages/CampaignsPage';
import ItemsPage from './pages/ItemsPage';
import UsersPage from './pages/UsersPage';
import ReportsPage from './pages/ReportsPage';
import CompaniesPage from './pages/admin/CompaniesPage';
import CountriesPage from './pages/admin/CountriesPage';
import VatRatesPage from './pages/admin/VatRatesPage';
import SalesRepresentativesPage from './pages/admin/SalesRepresentativesPage';

function FullScreenLoader() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <CircularProgress />
    </Box>
  );
}

export default function App() {
  const { initializing, isAuthenticated, isOwner } = useAuth();

  if (initializing) {
    return <FullScreenLoader />;
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }

  return (
    <CompanyProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/customers/:id" element={<CustomerDetailPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/meetings" element={<MeetingsPage />} />
          <Route path="/items" element={<ItemsPage />} />
          {isOwner && <Route path="/campaigns" element={<CampaignsPage />} />}
          {isOwner && <Route path="/users" element={<UsersPage />} />}
          {isOwner && <Route path="/admin/companies" element={<CompaniesPage />} />}
          {isOwner && <Route path="/admin/countries" element={<CountriesPage />} />}
          {isOwner && <Route path="/admin/vat-rates" element={<VatRatesPage />} />}
          {isOwner && (
            <Route path="/admin/sales-representatives" element={<SalesRepresentativesPage />} />
          )}
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
      <CompanySelectDialog />
    </CompanyProvider>
  );
}
