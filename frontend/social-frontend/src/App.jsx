import { useEffect, useContext } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, AuthContext } from "./context/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Feed from "./pages/Feed";
import Profile from "./pages/Profile";
import PostPage from "./pages/PostPage";
import Messenger from "./pages/Messenger";
import Navbar from "./components/Navbar";
import WelcomeModal from "./components/WelcomeModal";
import ProtectedRoute from "./components/ProtectedRoute";
import { ThemeProvider, ThemeContext } from "./context/ThemeContext";

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

function AppContent() {
  const { theme } = useContext(ThemeContext);
  const { showWelcome, closeWelcome, user } = useContext(AuthContext);

  // Apply dark class to html tag for consistent background and overscroll behavior
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
      <Navbar />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/feed" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
        <Route path="/profile/:userId" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/post/:postId" element={<ProtectedRoute><PostPage /></ProtectedRoute>} />
        <Route path="/messenger" element={<ProtectedRoute><Messenger /></ProtectedRoute>} />
      </Routes>

      <WelcomeModal 
        isOpen={showWelcome} 
        onClose={closeWelcome} 
        username={user?.username} 
      />
    </div>
  );
}

export default App;