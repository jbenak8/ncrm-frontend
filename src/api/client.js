import axios from 'axios';

// Axios instance used by the whole application. Authorization header is
// injected by the AuthContext (Basic for the local profile, Bearer for Keycloak).
const client = axios.create({
  baseURL: '/api',
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
    if (error.response && error.response.status === 401 && unauthorizedHandler) {
      unauthorizedHandler();
    }
    return Promise.reject(error);
  }
);

export default client;
