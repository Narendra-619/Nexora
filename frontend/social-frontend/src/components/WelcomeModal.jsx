import React, { useEffect } from "react";

const WelcomeModal = ({ isOpen, onClose, username }) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Premium Overlay with soft blue tint and deep blur */}
      <div 
        className="fixed inset-0 bg-blue-600/10 dark:bg-blue-600/5 backdrop-blur-2xl transition-opacity duration-1000 animate-fade-in"
        onClick={onClose}
      ></div>
      
      {/* Welcome Modal Content - Glassmorphism style */}
      <div className="relative bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-white/50 dark:border-zinc-800/50 w-full max-w-[500px] rounded-[48px] shadow-[0_40px_100px_-20px_rgba(37,99,235,0.3)] overflow-hidden transform transition-all animate-welcome-pop">
        
        {/* Animated background decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/15 blur-[80px] rounded-full -mr-32 -mt-32 animate-pulse-slow"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/15 blur-[60px] rounded-full -ml-24 -mb-24 animate-pulse-slow delay-700"></div>

        <div className="p-12 pb-8 text-center relative z-10">
          {/* Floating Hero Icon */}
          <div className="mx-auto w-28 h-28 bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 rounded-[36px] flex items-center justify-center mb-10 shadow-3xl shadow-blue-500/40 rotate-6 animate-float">
             <span className="text-5xl drop-shadow-lg">🚀</span>
          </div>

          <h3 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter mb-4 leading-tight">
            Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Nexora</span>, <br />
            <span className="text-zinc-800 dark:text-zinc-100">{username || "Explorer"}!</span>
          </h3>
          
          <div className="space-y-6 text-zinc-600 dark:text-zinc-400 text-lg font-medium leading-relaxed max-w-[360px] mx-auto">
            <p className="animate-slide-up opacity-0 [animation-fill-mode:forwards] [animation-delay:400ms]">
              Your space to connect, share moments, chat with friends, and express yourself.
            </p>
            <div className="bg-zinc-50/80 dark:bg-zinc-800/40 p-5 rounded-[24px] border border-zinc-100/50 dark:border-zinc-700/30 animate-slide-up opacity-0 [animation-fill-mode:forwards] [animation-delay:600ms]">
              <p className="text-sm font-bold tracking-wide text-blue-600 dark:text-blue-400">
                Start posting, reacting, and building your network today!
              </p>
            </div>
          </div>
        </div>

        <div className="p-12 pt-4 relative z-10 animate-slide-up opacity-0 [animation-fill-mode:forwards] [animation-delay:800ms]">
           <button
            onClick={onClose}
            className="w-full py-5 rounded-[24px] text-xl font-black bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:scale-[1.03] active:scale-[0.97] transition-all duration-500 shadow-2xl shadow-zinc-900/30 dark:shadow-white/10 group overflow-hidden relative"
          >
            <span className="relative z-10 flex items-center justify-center gap-3">
              Let's Get Started
              <svg className="w-6 h-6 transition-transform duration-500 group-hover:translate-x-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-10 transition-opacity duration-500"></div>
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes welcomePop {
          0% { opacity: 0; transform: scale(0.7) translateY(60px) rotate(-3deg); }
          100% { opacity: 1; transform: scale(1) translateY(0) rotate(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(6deg); }
          50% { transform: translateY(-15px) rotate(12deg); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseSlow {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.1); }
        }
        .animate-welcome-pop {
          animation: welcomePop 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        .animate-slide-up {
          animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .animate-pulse-slow {
          animation: pulseSlow 5s ease-in-out infinite;
        }
      `}} />
    </div>
  );
};

export default WelcomeModal;
