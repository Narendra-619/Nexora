import axios from "axios";

const rawBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
const cleanBaseUrl = rawBaseUrl.replace(/\/+$/, "");

const API = axios.create({
  baseURL: cleanBaseUrl.endsWith("/api")
    ? cleanBaseUrl
    : `${cleanBaseUrl}/api`
});

API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      const publicPaths = ["/", "/register", "/forgot-password", "/verify-otp", "/reset-password"];
      if (!publicPaths.includes(window.location.pathname)) {
        window.location.href = "/";
      }
    }
    return Promise.reject(error);
  }
);

export default API;