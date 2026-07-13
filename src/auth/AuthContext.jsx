import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import Keycloak from 'keycloak-js';
import client, { setAuthHeader, setUnauthorizedHandler } from '../api/client';

// Auth mode is driven by env variables:
//   VITE_AUTH_MODE=basic     -> username/password login against the backend "local" profile (HTTP Basic)
//   VITE_AUTH_MODE=keycloak  -> redirect login via Keycloak (backend "prod" profile, Bearer JWT)
const AUTH_MODE = import.meta.env.VITE_AUTH_MODE || 'basic';

const AuthContext = createContext(null);

let keycloak = null;

function getKeycloak() {
  if (!keycloak) {
    keycloak = new Keycloak({
      url: import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8081',
      realm: import.meta.env.VITE_KEYCLOAK_REALM || 'ncrm',
      clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'ncrm-frontend',
    });
  }
  return keycloak;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  const loadCurrentUser = useCallback(async (usernameHint) => {
    try {
      const { data } = await client.get('/users/me');
      setUser(data);
      return data;
    } catch (e) {
      // The backend "local" profile uses in-memory users that are not present in the DB,
      // so /users/me returns 404 while the credentials are valid (invalid ones yield 401).
      if (e.response && e.response.status === 404 && usernameHint) {
        const roleByUsername = {
          owner: 'OWNER',
          rep: 'SALES_REPRESENTATIVE',
          customer: 'CUSTOMER',
        };
        const synthetic = {
          id: null,
          username: usernameHint,
          firstName: usernameHint,
          lastName: '',
          roles: [roleByUsername[usernameHint] || 'CUSTOMER'],
        };
        setUser(synthetic);
        return synthetic;
      }
      throw e;
    }
  }, []);

  const logout = useCallback(() => {
    setAuthHeader(null);
    sessionStorage.removeItem('ncrm-basic-auth');
    sessionStorage.removeItem('ncrm-basic-user');
    setUser(null);
    if (AUTH_MODE === 'keycloak' && keycloak) {
      keycloak.logout({ redirectUri: window.location.origin });
    }
  }, []);

  // Initial session restore (Basic from sessionStorage or Keycloak SSO check).
  useEffect(() => {
    setUnauthorizedHandler(() => logout());
    async function init() {
      try {
        if (AUTH_MODE === 'keycloak') {
          const kc = getKeycloak();
          const authenticated = await kc.init({ onLoad: 'check-sso', pkceMethod: 'S256' });
          if (authenticated) {
            setAuthHeader(`Bearer ${kc.token}`);
            kc.onTokenExpired = () =>
              kc.updateToken(30).then(() => setAuthHeader(`Bearer ${kc.token}`));
            await loadCurrentUser();
          }
        } else {
          const stored = sessionStorage.getItem('ncrm-basic-auth');
          if (stored) {
            setAuthHeader(stored);
            await loadCurrentUser(sessionStorage.getItem('ncrm-basic-user') || undefined);
          }
        }
      } catch (e) {
        setAuthHeader(null);
        sessionStorage.removeItem('ncrm-basic-auth');
      } finally {
        setInitializing(false);
      }
    }
    init();
  }, [loadCurrentUser, logout]);

  const loginBasic = useCallback(
    async (username, password) => {
      const header = `Basic ${btoa(`${username}:${password}`)}`;
      setAuthHeader(header);
      try {
        const me = await loadCurrentUser(username);
        sessionStorage.setItem('ncrm-basic-auth', header);
        sessionStorage.setItem('ncrm-basic-user', username);
        return me;
      } catch (e) {
        setAuthHeader(null);
        throw e;
      }
    },
    [loadCurrentUser]
  );

  const loginKeycloak = useCallback(() => {
    getKeycloak().login({ redirectUri: window.location.origin });
  }, []);

  const value = useMemo(() => {
    const roles = user?.roles || [];
    const normalized = roles.map((r) => r.replace(/^ROLE_/, '').toUpperCase());
    return {
      authMode: AUTH_MODE,
      initializing,
      user,
      isAuthenticated: !!user,
      isOwner: normalized.includes('OWNER'),
      isSalesRep: normalized.includes('SALES_REPRESENTATIVE'),
      roles: normalized,
      loginBasic,
      loginKeycloak,
      logout,
    };
  }, [user, initializing, loginBasic, loginKeycloak, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
