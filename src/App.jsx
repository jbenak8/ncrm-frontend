import { Navigate, Route, Routes } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from './auth/AuthContext';
import { CompanyProvider } from './company/CompanyContext';
import Layout from './components/Layout';
import CompanySelectDialog from './components/CompanySelectDialog';
import ChangePasswordDialog from './components/ChangePasswordDialog';
import LoginPage from './pages/LoginPage';
import AiChatPage from './pages/AiChatPage';
import DashboardPage from './pages/DashboardPage';
import CustomersPage from './pages/CustomersPage';
import CustomerDetailPage from './pages/CustomerDetailPage';
import OrdersPage from './pages/OrdersPage';
import QuotationsPage from './pages/QuotationsPage';
import InvoicesPage from './pages/InvoicesPage';
import MeetingsPage from './pages/MeetingsPage';
import CampaignsPage from './pages/CampaignsPage';
import ItemsPage from './pages/ItemsPage';
import UsersPage from './pages/UsersPage';
import ReportsPage from './pages/ReportsPage';
import CompaniesPage from './pages/admin/CompaniesPage';
import CountriesPage from './pages/admin/CountriesPage';
import VatRatesPage from './pages/admin/VatRatesPage';
import SalesRepresentativesPage from './pages/admin/SalesRepresentativesPage';
import NumberSequencesPage from './pages/admin/NumberSequencesPage';

function FullScreenLoader() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <CircularProgress />
    </Box>
  );
}

export default function App() {
  const { initializing, isAuthenticated, isOwner, mustChangePassword, refreshUser } = useAuth();

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

  // The user has to change their password before being allowed to work with the app.
  if (mustChangePassword) {
    return (
      <>
        <FullScreenLoader />
        <ChangePasswordDialog open forced onChanged={refreshUser} />
      </>
    );
  }

  return (
    <CompanyProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/customers/:id" element={<CustomerDetailPage />} />
          <Route path="/quotations" element={<QuotationsPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/invoices" element={<InvoicesPage />} />
          <Route path="/meetings" element={<MeetingsPage />} />
          <Route path="/items" element={<ItemsPage />} />
          <Route path="/ai-chat" element={<AiChatPage />} />
          {isOwner && <Route path="/campaigns" element={<CampaignsPage />} />}
          {isOwner && <Route path="/users" element={<UsersPage />} />}
          {isOwner && <Route path="/admin/companies" element={<CompaniesPage />} />}
          {isOwner && <Route path="/admin/countries" element={<CountriesPage />} />}
          {isOwner && <Route path="/admin/vat-rates" element={<VatRatesPage />} />}
          {isOwner && <Route path="/admin/number-sequences" element={<NumberSequencesPage />} />}
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
