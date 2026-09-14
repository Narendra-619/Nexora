import { useContext, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { ChatContext } from "../context/ChatContext";

const BottomNav = () => {
  const { user } = useContext(AuthContext);
  const { unreadCount, resetInbox } = useContext(ChatContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  const handleCreateClick = (type) => {
    setShowCreateMenu(false);
    navigate("/feed", { state: { openMedia: type } });
  };

  const tabs = [
    {
      to: "/feed",
      label: "Feed",
      icon: (active) => (
        <svg className={`w-6 h-6 ${active ? "text-blue-600" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? "2.5" : "2"} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      to: "/messenger",
      label: "Messages",
      icon: (active) => (
        <div className="relative">
          <svg className={`w-6 h-6 ${active ? "text-blue-600" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? "2.5" : "2"} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 text-[9px] font-bold text-white px-1 shadow-sm ring-2 ring-white dark:ring-zinc-900">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
      )
    },
    {
      isCreate: true,
      label: "Create",
      icon: () => (
        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-600/30 -mt-4">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
          </svg>
        </div>
      )
    },
    {
      to: "/notifications",
      label: "Activity",
      icon: (active) => (
        <svg className={`w-6 h-6 ${active ? "text-blue-600" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? "2.5" : "2"} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      )
    },
    ...(user?._id || user?.id ? [{
      to: `/profile/${user._id || user.id}`,
      label: "Profile",
      icon: (active) => (
        <div className={`w-6 h-6 rounded-full overflow-hidden border-2 transition-colors ${active ? "border-blue-600" : "border-transparent"}`}>
          {user?.profilePicture ? (
            <img src={user.profilePicture} alt={user.username} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-blue-100 dark:bg-zinc-700 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xs font-bold">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      )
    }] : [])
  ];

  return (
    <>
      {/* Create menu backdrop */}
      {showCreateMenu && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setShowCreateMenu(false)}
        />
      )}

      {/* Floating Create Menu */}
      {showCreateMenu && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-white dark:bg-zinc-900 px-4 py-3 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 md:hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          <button
            onClick={() => handleCreateClick("image")}
            className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">Photo</span>
          </button>
          <button
            onClick={() => handleCreateClick("video")}
            className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">Video</span>
          </button>
        </div>
      )}

      {/* Main Bottom Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800 md:hidden px-4 py-1">
        <div className="flex items-center justify-around">
          {tabs.map(({ to, label, icon, isCreate }) => {
            if (isCreate) {
              return (
                <button
                  key="create"
                  onClick={() => setShowCreateMenu(!showCreateMenu)}
                  className="flex flex-col items-center gap-0.5 py-1"
                >
                  {icon()}
                </button>
              );
            }
            const isActive = location.pathname === to.split("?")[0] ||
              (to.startsWith("/profile") && location.pathname.startsWith("/profile"));
            return (
              <Link
                key={to}
                to={to}
                onClick={() => {
                  if (to === "/messenger") {
                    resetInbox();
                  }
                }}
                className="flex flex-col items-center gap-0.5 py-1 transition-all min-w-[48px]"
              >
                {icon(isActive)}
                <span className={`text-[10px] font-medium ${isActive ? "text-blue-600" : "text-zinc-500 dark:text-zinc-400"}`}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default BottomNav;
