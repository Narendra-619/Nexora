import { useEffect, useState } from "react";
import API from "../utils/api";
import PostCard from "../components/PostCard";
import CreatePost from "../components/CreatePost";

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchPosts = async (currentPage = 1) => {
    try {
      if (currentPage === 1) setLoading(true);
      const res = await API.get(`/posts?page=${currentPage}&limit=10`);
      
      if (res.data.length < 10) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }
      
      if (currentPage === 1) {
        setPosts(res.data);
      } else {
        // Filter out any posts already in state to prevent duplicates
        setPosts(prev => {
          const newPosts = res.data.filter(np => !prev.some(pp => pp._id === np._id));
          return [...prev, ...newPosts];
        });
      }
    } catch (err) {
      console.error("Failed to load posts", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setPage(1);
    fetchPosts(1);
  };

  useEffect(() => {
    fetchPosts(page);
  }, [page]);

  const handlePostDelete = (postId) => {
    setPosts(posts.filter(p => p._id !== postId));
  };

  const handlePostUpdate = (updatedPost) => {
    setPosts(posts.map(p => p._id === updatedPost._id ? updatedPost : p));
  };

  return (
    <div className="max-w-xl mx-auto py-10 px-4 sm:px-0">
      {/* Create Post Section */}
      <div className="fade-in">
        <CreatePost refresh={handleRefresh} />
      </div>

      {/* Posts Section */}
      <div className="space-y-4">
        {posts.map((post, index) => (
          <div key={post._id} className="fade-in" style={{ animationDelay: `${index * 50}ms` }}>
            <PostCard 
              post={post} 
              onPostDelete={() => handlePostDelete(post._id)}
              onPostUpdate={handlePostUpdate}
            />
          </div>
        ))}

        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-zinc-200 dark:border-zinc-800 border-t-blue-600"></div>
          </div>
        )}

        {!loading && posts.length === 0 && (
          <div className="card p-16 text-center fade-in border-dashed">
            <div className="w-24 h-24 bg-zinc-100 dark:bg-zinc-800/50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-zinc-400">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">No posts yet</h3>
            <p className="text-zinc-500 dark:text-zinc-400 mt-2 font-medium">Be the first to share a post.</p>
          </div>
        )}

        {hasMore && posts.length > 0 && !loading && (
          <div className="flex justify-center pt-8 pb-12">
            <button 
              onClick={() => setPage(page + 1)}
              className="px-10 py-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-bold uppercase text-xs tracking-widest rounded-2xl transition-all shadow-sm hover:shadow-lg active:scale-95"
            >
              Load More
            </button>
          </div>
        )}

        {!hasMore && posts.length > 0 && (
          <div className="py-12 flex items-center justify-center gap-4">
             <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1"></div>
             <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-widest">You're all caught up</span>
             <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1"></div>
          </div>
        )}
      </div>
    </div>
  );
}