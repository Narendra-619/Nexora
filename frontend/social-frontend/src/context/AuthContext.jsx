import { createContext, useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import API, { setAccessToken, setOnAuthFailure } from "../utils/api";

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null); // Pure in-memory access token
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("user");
      if (!savedUser) return null;
      const parsed = JSON.parse(savedUser);
      return {
        ...parsed,
        _id: parsed._id || parsed.id,
        id: parsed.id || parsed._id
      };
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true); // Initial silent session verification
  const [showWelcome, setShowWelcome] = useState(false);
  const navigate = useNavigate();
  const hasInitialized = useRef(false);

  // Synchronize in-memory token with api.js module state
  const updateTokenState = useCallback((newToken) => {
    setToken(newToken);
    setAccessToken(newToken);
  }, []);

  /**
   * Initial session bootstrap:
   * Probes /api/auth/refresh with HttpOnly cookie to establish in-memory access token.
   */
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initializeAuth = async () => {
      try {
        const res = await API.post("/auth/refresh");
        const freshAccessToken = res.data.accessToken || res.data.token;
        updateTokenState(freshAccessToken);

        if (res.data.user) {
          const normalized = {
            ...res.data.user,
            _id: res.data.user._id || res.data.user.id,
            id: res.data.user.id || res.data.user._id
          };
          setUser(normalized);
          localStorage.setItem("user", JSON.stringify(normalized));
        }
      } catch {
        // No active session or refresh expired
        updateTokenState(null);
        setUser(null);
        localStorage.removeItem("user");
        localStorage.removeItem("token"); // Clean up any legacy token
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [updateTokenState]);

  /**
   * Handle user login: stores access token in memory (never localStorage)
   */
  const loginAuth = useCallback((newToken, userData, isNew = false) => {
    const normalized = userData ? {
      ...userData,
      _id: userData._id || userData.id,
      id: userData.id || userData._id
    } : null;

    localStorage.removeItem("token"); // Ensure no token is left in localStorage
    if (normalized) {
      localStorage.setItem("user", JSON.stringify(normalized));
    }
    updateTokenState(newToken);
    setUser(normalized);

    if (isNew) {
      setShowWelcome(true);
    }
    navigate("/feed");
  }, [navigate, updateTokenState]);

  /**
   * Close the welcome modal
   */
  const closeWelcome = useCallback(() => setShowWelcome(false), []);

  /**
   * Handle user logout: revokes server session, clears HttpOnly cookie, and clears memory
   */
  const logoutAuth = useCallback(async () => {
    try {
      await API.post("/auth/logout");
    } catch (err) {
      console.warn("Logout request failed, clearing local state anyway:", err);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      updateTokenState(null);
      setUser(null);
      navigate("/");
    }
  }, [navigate, updateTokenState]);

  /**
   * Log out all active sessions/devices
   */
  const logoutAllDevices = useCallback(async () => {
    try {
      await API.post("/auth/logout-all");
    } catch (err) {
      console.error("Logout all devices error:", err);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      updateTokenState(null);
      setUser(null);
      navigate("/");
    }
  }, [navigate, updateTokenState]);

  // Hook into api.js for automatic session invalidation on terminal 401
  useEffect(() => {
    setOnAuthFailure(() => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      updateTokenState(null);
      setUser(null);
      const publicPaths = ["/", "/register", "/forgot-password", "/verify-otp", "/reset-password"];
      if (!publicPaths.includes(window.location.pathname)) {
        navigate("/");
      }
    });
  }, [navigate, updateTokenState]);

  /**
   * Update user details locally and in storage
   */
  const updateUser = useCallback((updatedData) => {
    setUser((prevUser) => {
      const newUser = {
        ...prevUser,
        ...updatedData,
        _id: updatedData._id || updatedData.id || prevUser?._id || prevUser?.id,
        id: updatedData.id || updatedData._id || prevUser?.id || prevUser?._id,
      };
      localStorage.setItem("user", JSON.stringify(newUser));
      return newUser;
    });
  }, []);

  const value = useMemo(() => ({
    token,
    accessToken: token,
    user,
    loading,
    loginAuth,
    logoutAuth,
    logoutAllDevices,
    updateUser,
    showWelcome,
    closeWelcome
  }), [token, user, loading, loginAuth, logoutAuth, logoutAllDevices, updateUser, showWelcome, closeWelcome]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
