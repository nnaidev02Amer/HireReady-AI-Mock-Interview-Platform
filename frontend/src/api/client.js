import axios from "axios";

const TOKEN_KEY = "token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

// Single axios instance: one base URL, automatic JWT header, one 401 policy.
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:8000",
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// App registers a callback here so a 401 logs the user out of React state too.
let onUnauthorized = null;
export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};

// A 401 from the login endpoint just means "wrong password": do not log out.
const isLoginRequest = (config) => (config?.url || "").endsWith("/auth/token");

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !isLoginRequest(error.config)) {
      clearToken();
      if (onUnauthorized) onUnauthorized();
      error.sessionExpired = true;
    }
    return Promise.reject(error);
  }
);

// Backend errors are always { detail: "message" }; tolerate FastAPI's list form too.
export const getErrorMessage = (error, fallback = "Something went wrong") => {
  if (!error.response) {
    return "Cannot reach the server. Is the backend running?";
  }
  const detail = error.response.data?.detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => d.msg).join(", ");
  }
  return typeof detail === "string" && detail ? detail : fallback;
};

export default api;
