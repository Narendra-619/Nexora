import { useEffect, useState, useRef, useCallback } from "react";
import API from "../utils/api";
import PostCard from "../components/PostCard";
import CreatePost from "../components/CreatePost";

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [activeTab, setActiveTab] = useState("explore");
  const loaderRef = useRef(null);
  const loadingRef = useRef(false);

  const postsCountRef = useRef(0);

  useEffect(() => {
    postsCountRef.current = posts.length;
  }, [posts.length]);

  const fetchPosts = useCallback(async (currentPage, tab, reset = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    try {
      if (reset) {
        setLoading(true);
        setError(null);
      }
      const feedParam = tab === "following" ? "&feed=following" : "";
      const res = await API.get(`/posts?page=${currentPage}&limit=10${feedParam}`);

      if (res.data.length < 10) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }

      if (reset) {
        setPosts(res.data);
      } else {
        setPosts(prev => {
          const newPosts = res.data.filter(np => !prev.some(pp => pp._id === np._id));
          return [...prev, ...newPosts];
        });
      }
    } catch (err) {
      console.error("Failed to load posts", err);
      if (reset || postsCountRef.current === 0) {
        setError(err.response?.data?.error || "Failed to load posts. Please try again.");
      }
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    setPosts([]);
    fetchPosts(1, activeTab, true);
  }, [activeTab, fetchPosts]);

  useEffect(() => {
    if (page > 1) {
      fetchPosts(page, activeTab, false);
    }
  }, [page, activeTab, fetchPosts]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingRef.current) {
          setPage(prev => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    const currentLoader = loaderRef.current;
    if (currentLoader) observer.observe(currentLoader);
    return () => {
      if (currentLoader) observer.unobserve(currentLoader);
    };
  }, [hasMore, loading]);

  const handleRefresh = () => {
    setPage(1);
    setHasMore(true);
    fetchPosts(1, activeTab, true);
  };

  const handlePostDelete = (postId) => {
    setPosts(prev => prev.filter(p => p._id !== postId));
  };

  const handlePostUpdate = (updatedPost) => {
    setPosts(prev => prev.map(p => p._id === updatedPost._id ? updatedPost : p));
  };

  return (
    <div className="max-w-2xl mx-auto lg:-translate-x-10 py-10 px-4 sm:px-0">

      <div className="fade-in">
        <CreatePost refresh={handleRefresh} />
      </div>

      <div className="flex gap-1 p-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-2xl mb-8 fade-in">
        <button
          onClick={() => setActiveTab("following")}
          className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "following"
              ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
          }`}
        >
          Following
        </button>
        <button
          onClick={() => setActiveTab("explore")}
          className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "explore"
              ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
          }`}
        >
          Explore
        </button>
      </div>

      <div className="space-y-6">
        {posts.map((post, index) => (
          <div key={post._id} className="fade-in" style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }}>
            <PostCard
              post={post}
              onPostDelete={() => handlePostDelete(post._id)}
              onPostUpdate={handlePostUpdate}
            />
          </div>
        ))}

        {loading && (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="skeleton w-10 h-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <div className="skeleton h-3.5 w-24 rounded-lg" />
                    <div className="skeleton h-2.5 w-16 rounded-lg" />
                  </div>
                </div>
                <div className="skeleton h-4 w-3/4 rounded-lg" />
                <div className="skeleton h-4 w-1/2 rounded-lg" />
                <div className="skeleton h-64 w-full rounded-xl" />
              </div>
            ))}
          </div>
        )}

        {error && !loading && posts.length === 0 && (
          <div className="card p-10 text-center fade-in border border-red-200 dark:border-red-900/30">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Unable to load feed</h3>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm">{error}</p>
            <button
              onClick={() => { setError(null); fetchPosts(1, activeTab, true); }}
              className="btn-primary mt-6 px-6 py-2 text-sm font-semibold inline-block"
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && posts.length === 0 && (
          <div className="card p-16 text-center fade-in border-dashed">
            <div className="w-24 h-24 bg-zinc-100 dark:bg-zinc-800/50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-zinc-400">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
              {activeTab === "following" ? "No posts from people you follow" : "No posts yet"}
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-sm">
              {activeTab === "following" ? "Follow someone to see their posts here." : "Be the first to share a post."}
            </p>
          </div>
        )}

        <div ref={loaderRef} />

        {!hasMore && posts.length > 0 && (
          <div className="py-12 flex items-center justify-center gap-4">
            <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1" />
            <span className="text-xs font-medium text-zinc-400 dark:text-zinc-600">You're all caught up</span>
            <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1" />
          </div>
        )}
      </div>
    </div>
  );
}
