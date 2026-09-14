import { useContext } from "react";
import { Link, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { ChatContext } from "../context/ChatContext";

const LeftSidebar = () => {
  const { user } = useContext(AuthContext);
  const { unreadCount, resetInbox } = useContext(ChatContext);
  const location = useLocation();

  const links = [
    {
      to: "/feed",
      label: "Feed",
      icon: (active) => (
        <svg className={`w-5 h-5 ${active ? "text-blue-600" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? "2.5" : "2"} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      to: "/messenger",
      label: "Messages",
      badge: unreadCount,
      icon: (active) => (
        <div className="relative">
          <svg className={`w-5 h-5 ${active ? "text-blue-600" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? "2.5" : "2"} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
      )
    },
    {
      to: "/scheduled",
      label: "Scheduled",
      icon: (active) => (
        <svg className={`w-5 h-5 ${active ? "text-blue-600" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? "2.5" : "2"} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      to: "/drafts",
      label: "Drafts",
      icon: (active) => (
        <svg className={`w-5 h-5 ${active ? "text-blue-600" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? "2.5" : "2"} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      to: "/saved",
      label: "Saved",
      icon: (active) => (
        <svg className={`w-5 h-5 ${active ? "text-blue-600" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? "2.5" : "2"} d="M5 2h14a1 1 0 011 1v19.143a.5.5 0 01-.766.424L12 18.03l-7.234 4.536A.5.5 0 014 22.143V3a1 1 0 011-1zm7 14l5.5-3.5V3H6.5v9.5L12 16z" />
        </svg>
      )
    },
    {
      to: "/analytics",
      label: "Analytics",
      icon: (active) => (
        <svg className={`w-5 h-5 ${active ? "text-blue-600" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? "2.5" : "2"} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    ...(user?._id || user?.id ? [{
      to: `/profile/${user._id || user.id}`,
      label: "Profile",
      icon: (active) => (
        <svg className={`w-5 h-5 ${active ? "text-blue-600" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? "2.5" : "2"} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    }] : [])
  ];

  return (
    <aside className="hidden lg:flex flex-col w-[240px] shrink-0 pt-24 pb-8 px-4 fixed left-0 top-0 h-screen">
      <div className="flex flex-col gap-1">
        {links.map(({ to, label, icon, badge }) => {
          const isActive = location.pathname === to ||
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
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-[15px] font-medium ${isActive
                  ? "bg-blue-50 dark:bg-blue-950/30 text-blue-600"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-white"
                }`}
            >
              {icon(isActive)}
              <span className="flex-1">{label}</span>
              {badge > 0 && (
                <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-bold rounded-full bg-blue-600 text-white shadow-sm shadow-blue-500/30">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </aside>
  );
};

export default LeftSidebar;
