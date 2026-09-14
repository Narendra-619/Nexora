import { useEffect, useContext } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, AuthContext } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Feed from "./pages/Feed";
import Profile from "./pages/Profile";
import PostPage from "./pages/PostPage";
import Messenger from "./pages/Messenger";
import SavedPosts from "./pages/SavedPosts";
import FollowersList from "./pages/FollowersList";
import FollowingList from "./pages/FollowingList";
import ForgotPassword from "./pages/ForgotPassword";
import VerifyOTP from "./pages/VerifyOTP";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import Analytics from "./pages/Analytics";
import ScheduledPosts from "./pages/ScheduledPosts";
import DraftsPage from "./pages/DraftsPage";
import Navbar from "./components/Navbar";
import LeftSidebar from "./components/LeftSidebar";
import BottomNav from "./components/BottomNav";
import WelcomeModal from "./components/WelcomeModal";
import ProtectedRoute from "./components/ProtectedRoute";
import { ChatProvider } from "./context/ChatContext";
import { ThemeProvider, ThemeContext } from "./context/ThemeContext";
import ErrorBoundary from "./components/ErrorBoundary";

function PageWrapper({ children }) {
  return (
    <div className="fade-in">
      {children}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <ChatProvider>
              <ToastProvider>
                <ErrorBoundary>
                  <AppContent />
                </ErrorBoundary>
              </ToastProvider>
            </ChatProvider>
          </AuthProvider>
        </ThemeProvider>
    </BrowserRouter>
  );
}

function AppContent() {
  const { theme } = useContext(ThemeContext);
  const { showWelcome, closeWelcome, user, token, loading } = useContext(AuthContext);
  const isAuthenticated = !!user && !!token;

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 animate-pulse">
            <span className="font-black text-xl tracking-wider">N</span>
          </div>
          <div className="w-6 h-6 border-2 border-zinc-300 dark:border-zinc-700 border-t-blue-600 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
      <Navbar />
      <div className="flex">
        {isAuthenticated && <LeftSidebar />}
        <main className={`flex-1 min-w-0 ${isAuthenticated ? "lg:ml-[240px] pb-20 lg:pb-0" : ""}`}>
          <PageWrapper>
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/verify-otp" element={<VerifyOTP />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/feed" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
              <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
              <Route path="/scheduled" element={<ProtectedRoute><ScheduledPosts /></ProtectedRoute>} />
              <Route path="/drafts" element={<ProtectedRoute><DraftsPage /></ProtectedRoute>} />
              <Route path="/profile/:userId" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/profile/:userId/followers" element={<ProtectedRoute><FollowersList /></ProtectedRoute>} />
              <Route path="/profile/:userId/following" element={<ProtectedRoute><FollowingList /></ProtectedRoute>} />
              <Route path="/post/:postId" element={<ProtectedRoute><PostPage /></ProtectedRoute>} />
              <Route path="/messenger" element={<ProtectedRoute><Messenger /></ProtectedRoute>} />
              <Route path="/saved" element={<ProtectedRoute><SavedPosts /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </PageWrapper>
        </main>
      </div>
      {isAuthenticated && <BottomNav />}

      <WelcomeModal
        isOpen={showWelcome}
        onClose={closeWelcome}
        username={user?.username}
      />
    </div>
  );
}

export default App;
