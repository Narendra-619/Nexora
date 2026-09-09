import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../utils/api";

function getPasswordStrength(password) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  return score;
}

function getStrengthLabel(score) {
  if (score <= 1) return { label: "Weak", color: "bg-red-500", textColor: "text-red-500" };
  if (score <= 2) return { label: "Fair", color: "bg-orange-500", textColor: "text-orange-500" };
  if (score <= 3) return { label: "Good", color: "bg-yellow-500", textColor: "text-yellow-500" };
  if (score <= 4) return { label: "Strong", color: "bg-green-500", textColor: "text-green-500" };
  return { label: "Very strong", color: "bg-emerald-500", textColor: "text-emerald-500" };
}

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const strengthInfo = getStrengthLabel(strength);

  const validate = () => {
    const errors = {};
    if (!username.trim()) errors.username = "Username is required";
    else if (username.length < 3) errors.username = "Username must be at least 3 characters";
    else if (username.length > 30) errors.username = "Username must be under 30 characters";
    else if (!/^[a-zA-Z0-9_]+$/.test(username)) errors.username = "Only letters, numbers, and underscores (_) allowed";

    if (!email.trim()) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Invalid email address";

    if (!password) errors.password = "Password is required";
    else if (password.length < 8) errors.password = "Must be at least 8 characters";

    if (!confirmPassword) errors.confirmPassword = "Please confirm your password";
    else if (password !== confirmPassword) errors.confirmPassword = "Passwords don't match";

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setError("");
    try {
      await API.post("/auth/register", { username, email, password });
      navigate("/verify-otp", { state: { email, purpose: "registration" } });
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const clearField = (field) => setFieldErrors(prev => ({ ...prev, [field]: null }));

  return (
    <div className="min-h-[calc(100vh-4.5rem)] flex justify-center px-4 pt-6 sm:pt-10 pb-12 relative overflow-hidden">
      {/* Background — clean, minimal */}
      <div className="absolute inset-0 bg-zinc-50 dark:bg-black" />

      <div className="w-full max-w-[380px] relative z-10 slide-up">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl overflow-hidden mx-auto mb-3 shadow-sm">
            <img src="/logo.png" alt="Nexora" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">
            Create account
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm">
            Join Nexora and start connecting
          </p>
        </div>

        {/* Card — glass, no shadow */}
        <div className="glass rounded-3xl p-6 sm:p-8">
          {error && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 p-4 mb-6 rounded-2xl flex items-center gap-3 animate-shake">
              <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <p className="text-sm font-medium text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleRegister}>
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Username
              </label>
              <input
                type="text"
                required
                className={`input-field ${fieldErrors.username ? 'ring-2 ring-red-500 border-red-500' : ''}`}
                placeholder="johndoe"
                value={username}
                onChange={(e) => { setUsername(e.target.value); clearField("username"); }}
              />
              {fieldErrors.username && (
                <p className="text-xs font-medium text-red-500 mt-1.5 ml-1">{fieldErrors.username}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                className={`input-field ${fieldErrors.email ? 'ring-2 ring-red-500 border-red-500' : ''}`}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); clearField("email"); }}
              />
              {fieldErrors.email && (
                <p className="text-xs font-medium text-red-500 mt-1.5 ml-1">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  className={`input-field pr-12 ${fieldErrors.password ? 'ring-2 ring-red-500 border-red-500' : ''}`}
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearField("password"); }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-xs font-medium text-red-500 mt-1.5 ml-1">{fieldErrors.password}</p>
              )}

              {/* Strength indicator — thin line style */}
              {password.length > 0 && (
                <div className="mt-2.5">
                  <div className={`h-1 rounded-full transition-all duration-200 ${strengthInfo.color}`} style={{ width: `${(strength / 5) * 100}%` }} />
                  <p className={`text-xs font-medium mt-1.5 ${strengthInfo.textColor}`}>
                    {strengthInfo.label}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Confirm password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  required
                  className={`input-field pr-12 ${fieldErrors.confirmPassword ? 'ring-2 ring-red-500 border-red-500' : ''}`}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); clearField("confirmPassword"); }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                  tabIndex={-1}
                >
                  {showConfirm ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p className="text-xs font-medium text-red-500 mt-1.5 ml-1">{fieldErrors.confirmPassword}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 mt-2 flex items-center justify-center gap-2.5 text-[15px]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span>Create Account</span>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-zinc-200/50 dark:border-zinc-800/50 text-center">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Already have an account?{" "}
              <Link to="/" className="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
