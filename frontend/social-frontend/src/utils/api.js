import axios from "axios";

const rawBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
const cleanBaseUrl = rawBaseUrl.replace(/\/+$/, "");

const API = axios.create({
  baseURL: cleanBaseUrl.endsWith("/api")
    ? cleanBaseUrl
    : `${cleanBaseUrl}/api`,
  withCredentials: true // Crucial: send and receive HttpOnly cookies across all requests
});

let inMemoryToken = null;
let authFailureCallback = null;

export const setAccessToken = (token) => {
  inMemoryToken = token;
};

export const getAccessToken = () => {
  return inMemoryToken;
};

export const setOnAuthFailure = (callback) => {
  authFailureCallback = callback;
};

// Request interceptor: attach in-memory access token as Bearer token
API.interceptors.request.use((config) => {
  if (inMemoryToken) {
    config.headers.Authorization = `Bearer ${inMemoryToken}`;
  }
  return config;
});

// Mutex queue for concurrent 401 refresh calls
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor: automatically refresh expired access token once and replay queued requests
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Do not attempt refresh on auth entry endpoints (login, register, refresh itself)
    const isAuthEndpoint =
      originalRequest.url?.includes("/auth/login") ||
      originalRequest.url?.includes("/auth/register") ||
      originalRequest.url?.includes("/auth/refresh");

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        // Another refresh request is already in-flight; queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return API(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await API.post("/auth/refresh");
        const newAccessToken = res.data.accessToken || res.data.token;
        setAccessToken(newAccessToken);

        processQueue(null, newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return API(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        setAccessToken(null);

        if (authFailureCallback) {
          authFailureCallback();
        } else {
          const publicPaths = ["/", "/register", "/forgot-password", "/verify-otp", "/reset-password"];
          if (!publicPaths.includes(window.location.pathname)) {
            window.location.href = "/";
          }
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default API;