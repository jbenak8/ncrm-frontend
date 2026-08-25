import axios from 'axios';

// Base URL of the backend. Empty by default: requests stay relative and go
// through the dev server / nginx proxy. For standalone builds published on a
// static hosting it is baked in at build time via VITE_API_URL.
export const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');

// Axios instance used by the whole application. Authorization header is
// injected by the AuthContext (Basic for the local profile, Bearer for Keycloak).
const client = axios.create({
  baseURL: `${API_URL}/api`,
});

let unauthorizedHandler = null;

export function setAuthHeader(value) {
  if (value) {
    client.defaults.headers.common.Authorization = value;
  } else {
    delete client.defaults.headers.common.Authorization;
  }
}

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && unauthorizedHandler) {
      unauthorizedHandler();
    }
    return Promise.reject(error);
  }
);

export default client;
