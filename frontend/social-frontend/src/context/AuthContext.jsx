import { createContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const navigate = useNavigate();

  useEffect(() => {
    // If token exists and we are on auth pages, redirect to feed
    if (token) {
      if (window.location.pathname === "/" || window.location.pathname === "/register") {
        navigate("/feed");
      }
    }
  }, [token, navigate]);

  /**
   * Handle user login: stores token and navigates to the feed
   */
  const loginAuth = (newToken, userData) => {
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
    navigate("/feed");
  };

  /**
   * Handle user logout: clears authorization state and redirects
   */
  const logoutAuth = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    navigate("/");
  };

  /**
   * Update user details locally and in storage
   */
  const updateUser = (updatedData) => {
    const newUser = { ...user, ...updatedData };
    localStorage.setItem("user", JSON.stringify(newUser));
    setUser(newUser);
  };

  return (
    <AuthContext.Provider value={{ token, user, loginAuth, logoutAuth, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
