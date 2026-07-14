import { useEffect, useState } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import BusinessIcon from '@mui/icons-material/Business';
import PublicIcon from '@mui/icons-material/Public';
import PercentIcon from '@mui/icons-material/Percent';
import BadgeIcon from '@mui/icons-material/Badge';
import CheckIcon from '@mui/icons-material/Check';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import StarIcon from '@mui/icons-material/Star';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import EventIcon from '@mui/icons-material/Event';
import CampaignIcon from '@mui/icons-material/Campaign';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import LogoutIcon from '@mui/icons-material/Logout';
import client from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useCompany } from '../company/CompanyContext';
import Footer from './Footer';

const DRAWER_WIDTH = 240;

/**
 * Logo of the active company shown in the application bar. The image is
 * fetched through the authenticated API client; when the company has no
 * logo, nothing is rendered.
 */
function CompanyLogo({ companyId }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!companyId) {
      setUrl(null);
      return undefined;
    }
    let objectUrl = null;
    let cancelled = false;
    client
      .get(`/companies/${companyId}/logo`, { responseType: 'blob' })
      .then((res) => {
        if (!cancelled && res.data && res.data.size > 0) {
          objectUrl = URL.createObjectURL(res.data);
          setUrl(objectUrl);
        }
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [companyId]);

  if (!url) return null;
  return (
    <Box
      component="img"
      src={url}
      alt="Logo společnosti"
      sx={{ height: 36, maxWidth: 120, objectFit: 'contain', mr: 1.5, bgcolor: 'white', borderRadius: 0.5, p: 0.25 }}
    />
  );
}

export default function Layout({ children }) {
  const { user, isOwner, logout } = useAuth();
  const { companySelectionAvailable, companies, activeCompany, selectCompany } = useCompany();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [companyAnchorEl, setCompanyAnchorEl] = useState(null);

  // Company switching is only offered to the owner (administrator); sales
  // representatives and customers are bound to a concrete company.
  const showCompanySwitcher = companySelectionAvailable && companies.length > 0;

  const companyMenu = (
    <Menu
      anchorEl={companyAnchorEl}
      open={!!companyAnchorEl}
      onClose={() => setCompanyAnchorEl(null)}
    >
      {companies.map((c) => (
        <MenuItem
          key={c.id}
          selected={activeCompany?.id === c.id}
          onClick={() => {
            selectCompany(c.id);
            setCompanyAnchorEl(null);
            setAnchorEl(null);
          }}
        >
          <ListItemIcon>
            {activeCompany?.id === c.id ? (
              <CheckIcon fontSize="small" />
            ) : c.defaultCompany ? (
              <StarIcon fontSize="small" color="warning" />
            ) : (
              <BusinessIcon fontSize="small" />
            )}
          </ListItemIcon>
          {c.name}
        </MenuItem>
      ))}
    </Menu>
  );

  const navItems = [
    { to: '/', label: 'Dashboard', icon: <DashboardIcon /> },
    { to: '/customers', label: 'Zákazníci', icon: <PeopleIcon /> },
    { to: '/orders', label: 'Objednávky', icon: <ShoppingCartIcon /> },
    { to: '/meetings', label: 'Schůzky', icon: <EventIcon /> },
    { to: '/items', label: 'Položky', icon: <Inventory2Icon /> },
    ...(isOwner ? [{ to: '/campaigns', label: 'Kampaně', icon: <CampaignIcon /> }] : []),
    { to: '/ai-chat', label: 'AI chat', icon: <SmartToyIcon /> },
    { to: '/reports', label: 'Reporty', icon: <AssessmentIcon /> },
  ];

  const adminItems = isOwner
    ? [
        { to: '/admin/companies', label: 'Společnosti', icon: <BusinessIcon /> },
        { to: '/admin/countries', label: 'Země', icon: <PublicIcon /> },
        { to: '/admin/vat-rates', label: 'Sazby DPH', icon: <PercentIcon /> },
        { to: '/admin/sales-representatives', label: 'Obchodní zástupci', icon: <BadgeIcon /> },
        { to: '/users', label: 'Uživatelé', icon: <ManageAccountsIcon /> },
      ]
    : [];

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.username || '';

  const drawerContent = (
    <Box>
      <Toolbar>
        <Typography variant="h6" color="primary" fontWeight={700}>
          nCRM
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {navItems.map((item) => (
          <ListItemButton
            key={item.to}
            component={RouterLink}
            to={item.to}
            selected={
              item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
            }
            onClick={() => setMobileOpen(false)}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
      {adminItems.length > 0 && (
        <>
          <Divider />
          <List
            subheader={
              <Typography variant="caption" color="text.secondary" sx={{ pl: 2 }}>
                Administrace
              </Typography>
            }
          >
            {showCompanySwitcher && (
              <ListItemButton onClick={(e) => setCompanyAnchorEl(e.currentTarget)}>
                <ListItemIcon>
                  <SwapHorizIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Přepnout společnost"
                  secondary={activeCompany?.name || 'Nevybráno'}
                />
              </ListItemButton>
            )}
            {adminItems.map((item) => (
              <ListItemButton
                key={item.to}
                component={RouterLink}
                to={item.to}
                selected={location.pathname.startsWith(item.to)}
                onClick={() => setMobileOpen(false)}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            ))}
          </List>
        </>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            sx={{ mr: 2, display: { md: 'none' } }}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <MenuIcon />
          </IconButton>
          {activeCompany && <CompanyLogo companyId={activeCompany.id} />}
          {activeCompany && (
            <Typography variant="h6" sx={{ mr: 2, whiteSpace: 'nowrap' }}>
              {activeCompany.name}
            </Typography>
          )}
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography
              variant="subtitle1"
              noWrap
              sx={{ opacity: 0.85, display: { xs: 'none', sm: 'block' } }}
            >
              nCRM — moderní CRM nástroj
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ mr: 1, display: { xs: 'none', sm: 'block' } }}>
            {displayName}
          </Typography>
          <IconButton color="inherit" onClick={(e) => setAnchorEl(e.currentTarget)}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
              {(displayName[0] || '?').toUpperCase()}
            </Avatar>
          </IconButton>
          <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)}>
            <MenuItem disabled>{user?.email || user?.username}</MenuItem>
            {showCompanySwitcher && (
              <MenuItem onClick={(e) => setCompanyAnchorEl(e.currentTarget)}>
                <ListItemIcon>
                  <SwapHorizIcon fontSize="small" />
                </ListItemIcon>
                Přepnout společnost{activeCompany ? ` (${activeCompany.name})` : ''}
              </MenuItem>
            )}
            <MenuItem onClick={logout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              Odhlásit se
            </MenuItem>
          </Menu>
          {companyMenu}
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH },
          }}
        >
          {drawerContent}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
          }}
        >
          {drawerContent}
        </Drawer>
      </Box>

      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Toolbar />
        <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
          {children}
        </Box>
        <Footer />
      </Box>
    </Box>
  );
}
