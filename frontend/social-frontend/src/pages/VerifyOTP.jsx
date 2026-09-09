import { useState, useRef, useEffect, useContext } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import API from "../utils/api";

export default function VerifyOTP() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { loginAuth } = useContext(AuthContext);

  const email = location.state?.email;
  const purpose = location.state?.purpose || "password-reset";
  const isRegistration = purpose === "registration";

  useEffect(() => {
    if (!email) {
      navigate(isRegistration ? "/register" : "/forgot-password");
    }
    inputRefs.current[0]?.focus();
  }, [email, navigate, isRegistration]);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newOtp = pasted.split("").concat(Array(6 - pasted.length).fill(""));
    setOtp(newOtp);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otpString = otp.join("");
    if (otpString.length !== 6) {
      setError("Please enter the complete 6-digit code");
      return;
    }

    setLoading(true);
    setError("");
    try {
      if (isRegistration) {
        const res = await API.post("/auth/verify-email", { email, otp: otpString });
        loginAuth(res.data.token, res.data.user, true);
        navigate("/feed");
      } else {
        const res = await API.post("/auth/verify-otp", { email, otp: otpString });
        navigate("/reset-password", { state: { resetToken: res.data.resetToken } });
      }
    } catch (err) {
      setError(err.response?.data?.error || "Invalid code");
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError("");
    try {
      if (isRegistration) {
        await API.post("/auth/resend-verification", { email });
      } else {
        await API.post("/auth/forgot-password", { email });
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to resend code");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4.5rem)] flex justify-center px-4 pt-6 sm:pt-10 pb-12">
      <div className="w-full max-w-[400px] fade-in">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl overflow-hidden mx-auto mb-3 shadow-sm">
            <img src="/logo.png" alt="logo" className="w-full h-full object-cover" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">Verify Code</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1.5 text-sm font-medium">
            {isRegistration
              ? "Enter the 6-digit code sent to verify your email"
              : "Enter the 6-digit code sent to your email"}
          </p>
        </div>

        <div className="card p-8">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 p-4 mb-6 rounded-xl flex items-center gap-3">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-center gap-3">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  className="w-12 h-14 text-center text-xl font-black bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <span>Verify Code</span>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isRegistration ? (
                <button
                  onClick={handleResend}
                  disabled={resending}
                  className="font-bold text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
                >
                  {resending ? "Resending..." : "Resend code"}
                </button>
              ) : (
                <Link to="/forgot-password" className="font-bold text-blue-600 dark:text-blue-400 hover:underline">
                  Resend code
                </Link>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
