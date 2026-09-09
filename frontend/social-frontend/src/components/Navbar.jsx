import { useContext, useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { ThemeContext } from "../context/ThemeContext";
import NotificationDropdown from "./NotificationDropdown";
import API from "../utils/api";

const Navbar = () => {
  const { user, token, logoutAuth } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState({ users: [], posts: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const searchRef = useRef(null);
  const profileMenuRef = useRef(null);
  const mobileSearchRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
      if (mobileSearchRef.current && !mobileSearchRef.current.contains(event.target)) {
        setShowMobileSearch(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ users: [], posts: [] });
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    const delayDebounceFn = setTimeout(async () => {
      try {
        const [usersRes, postsRes] = await Promise.all([
          API.get(`/users/search?q=${searchQuery}`),
          API.get(`/posts/search?q=${searchQuery}`)
        ]);
        setSearchResults({
          users: usersRes.data,
          posts: postsRes.data
        });
      } catch (err) {
        console.error("Search failed", err);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const renderSearchResults = () => {
    if (!searchQuery.trim()) return null;

    if (isSearching) {
      return (
        <div className="p-3 space-y-3">
          <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-2">Searching...</div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-2 rounded-xl animate-pulse">
              <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 bg-zinc-200 dark:bg-zinc-800 rounded-md w-1/3" />
                <div className="h-2.5 bg-zinc-100 dark:bg-zinc-800/60 rounded-md w-1/4" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="max-h-[60vh] overflow-y-auto p-2">
        {searchResults.users.length > 0 && (
          <div className="mb-2">
            <h3 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2 px-3">Users</h3>
            {searchResults.users.map(u => (
              <Link
                key={u._id}
                to={`/profile/${u._id}`}
                onClick={() => {
                  setShowDropdown(false);
                  setShowMobileSearch(false);
                  setSearchQuery("");
                }}
                className="flex items-center gap-3 p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-700">
                  {u.profilePicture ? (
                    <img src={u.profilePicture} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-blue-600">
                      {u.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="font-bold text-zinc-900 dark:text-white group-hover:text-blue-600 transition-colors">{u.username}</span>
              </Link>
            ))}
          </div>
        )}

        {searchResults.posts.length > 0 && (
          <div className="pt-2 border-t dark:border-zinc-800">
            <h3 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2 px-3">Posts</h3>
            {searchResults.posts.map(p => (
              <div
                key={p._id}
                className="p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
                onClick={() => {
                  setShowDropdown(false);
                  setShowMobileSearch(false);
                  setSearchQuery("");
                  navigate(`/post/${p._id}`);
                }}
              >
                <p className="text-sm text-zinc-800 dark:text-zinc-200 line-clamp-2 font-medium leading-relaxed">{p.text || (p.video ? "Watch Video" : p.image ? "View Photo" : "View Post")}</p>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 font-bold">BY @{p.userId?.username}</p>
              </div>
            ))}
          </div>
        )}

        {searchResults.users.length === 0 && searchResults.posts.length === 0 && (
          <div className="p-8 text-center text-sm text-zinc-500 dark:text-zinc-400 font-medium">No results found</div>
        )}
      </div>
    );
  };

  return (
    <nav className="sticky top-0 z-[60] bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl transition-all duration-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-4 sm:gap-6">
          {/* Left: Brand & Search */}
          <div className="flex items-center flex-1 gap-4 sm:gap-8">
            <Link to="/feed" className="flex items-center gap-2 group shrink-0">
              <div className="w-10 h-10 rounded-xl overflow-hidden transition-all group-hover:scale-110 group-hover:rotate-6 shadow-lg shadow-blue-600/30">
                <img src="/logo.png" alt="logo" className="w-full h-full object-cover" />
              </div>
              <span className="text-2xl font-bold tracking-tighter text-zinc-900 dark:text-white hidden sm:block">
                Nexora
              </span>
            </Link>

            {/* Desktop search */}
            {(user || token) && (
              <div className="relative flex-1 max-w-md hidden md:block" ref={searchRef}>
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search users or posts..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  className="w-full bg-zinc-100 dark:bg-zinc-800/50 dark:text-white border-transparent focus:bg-white dark:focus:bg-zinc-800 rounded-2xl pl-11 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 transition-all"
                />

                {showDropdown && searchQuery.trim() && (
                  <div className="absolute top-full mt-3 w-full bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden z-50 fade-in">
                    {isSearching ? (
                      <div className="p-6 text-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-zinc-300 dark:border-zinc-700 border-t-blue-600 mx-auto"></div>
                      </div>
                    ) : renderSearchResults()}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Mobile search icon */}
            {(user || token) && (
              <button
                onClick={() => setShowMobileSearch(!showMobileSearch)}
                className="md:hidden p-2 rounded-full text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            )}

            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all hover:text-zinc-900 dark:hover:text-white"
              title="Toggle Theme"
            >
              {theme === 'dark' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              )}
            </button>

            {(user || token) ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <NotificationDropdown />

                <div className="relative" ref={profileMenuRef}>
                  <button
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="flex items-center gap-2 p-1 pr-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                  >
                    <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden border border-zinc-200 dark:border-zinc-700">
                      {user?.profilePicture ? (
                        <img src={user.profilePicture} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-blue-600 text-xs">
                          {user?.username?.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 hidden md:block">
                      {user?.username}
                    </span>
                    <svg className="w-4 h-4 text-zinc-400 hidden md:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </button>

                  {showProfileMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                      <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-100 dark:border-zinc-800 py-2 z-50 fade-in">
                        <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
                          <p className="text-sm font-semibold text-zinc-900 dark:text-white">{user?.username}</p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{user?.email}</p>
                        </div>
                        <Link
                          to={`/profile/${user?._id || user?.id}`}
                          onClick={() => setShowProfileMenu(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                          Profile
                        </Link>
                        <Link
                          to="/analytics"
                          onClick={() => setShowProfileMenu(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                          Stats
                        </Link>
                        <Link
                          to="/scheduled"
                          onClick={() => setShowProfileMenu(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          Scheduled
                        </Link>
                        <div className="border-t border-zinc-100 dark:border-zinc-800 mt-1 pt-1">
                          <button
                            onClick={() => { setShowProfileMenu(false); logoutAuth(); }}
                            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                            Log out
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link to="/" className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:text-blue-600 transition">Log in</Link>
                <Link to="/register" className="btn-primary text-sm py-2">Join</Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile search overlay */}
      {(user || token) && showMobileSearch && (
        <div className="md:hidden border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 fade-in" ref={mobileSearchRef}>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search users or posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="w-full bg-zinc-100 dark:bg-zinc-800/50 dark:text-white border-transparent focus:bg-white dark:focus:bg-zinc-800 rounded-2xl pl-11 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>
          {searchQuery.trim() && (
            <div className="mt-2 max-h-[50vh] overflow-y-auto rounded-xl">
              {isSearching ? (
                <div className="p-6 text-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-zinc-300 dark:border-zinc-700 border-t-blue-600 mx-auto"></div>
                </div>
              ) : renderSearchResults()}
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
