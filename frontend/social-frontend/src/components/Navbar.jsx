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
  const searchRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowDropdown(false);
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

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
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
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  return (
    <nav className="sticky top-0 z-[60] bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 transition-all duration-300">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between h-16 gap-6">
          {/* Left: Brand & Search */}
          <div className="flex items-center flex-1 gap-8">
            <Link to="/feed" className="flex items-center gap-2 group shrink-0">
              <div className="w-10 h-10 rounded-xl overflow-hidden transition-all group-hover:scale-110 group-hover:rotate-6 shadow-lg shadow-blue-600/30">
                <img src="/logo.png" alt="logo" className="w-full h-full object-cover" />
              </div>
              <span className="text-2xl font-bold tracking-tighter text-zinc-900 dark:text-white hidden sm:block">
                Nexora
              </span>
            </Link>

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
                    ) : (
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
                                  setSearchQuery("");
                                  navigate(`/post/${p._id}`);
                                }}
                              >
                                <p className="text-sm text-zinc-800 dark:text-zinc-200 line-clamp-2 font-medium leading-relaxed">{p.text || "View attachment"}</p>
                                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 font-bold">BY @{p.userId?.username}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {searchResults.users.length === 0 && searchResults.posts.length === 0 && (
                          <div className="p-8 text-center text-sm text-zinc-500 dark:text-zinc-400 font-medium">No results found</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            <button 
              onClick={toggleTheme} 
              className="p-2.5 rounded-full text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all hover:text-zinc-900 dark:hover:text-white"
              title="Toggle Theme"
            >
              {theme === 'dark' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              )}
            </button>

            {(user || token) ? (
              <div className="flex items-center gap-3">
                <Link 
                  to="/messenger" 
                  className="p-2.5 rounded-full text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all hidden sm:flex"
                  title="Messages"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </Link>
                
                <NotificationDropdown />

                <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 mx-1 hidden sm:block"></div>

                <Link
                  to={`/profile/${user?._id || user?.id}`}
                  className="flex items-center gap-3 group p-1 pr-3 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                >
                  <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden border border-zinc-200 dark:border-zinc-700 group-hover:border-blue-500 transition-all">
                    {user?.profilePicture ? (
                      <img src={user.profilePicture} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-blue-600 text-xs">
                        {user?.username?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300 hidden lg:block tracking-tight">
                    {user?.username}
                  </span>
                </Link>

                <button
                  onClick={logoutAuth}
                  className="text-xs font-bold text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors px-2"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link to="/" className="text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:text-blue-600 transition">Log in</Link>
                <Link to="/register" className="btn-primary text-sm py-2">Join</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
