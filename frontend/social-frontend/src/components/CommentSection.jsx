import { useState } from "react";
import { Link } from "react-router-dom";
import API from "../utils/api";

export default function CommentSection({ post, onCommentAdded }) {
  const [comments, setComments] = useState(post.comments || []);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const handleComment = async () => {
    if (!text.trim()) return;
    setLoading(true);

    try {
      const res = await API.post(`/posts/${post._id}/comment`, { text });
      setComments(res.data.comments);
      if (onCommentAdded) onCommentAdded(res.data.comments.length);
      setText("");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {comments.length > 0 && (
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {comments.map((c) => {
            const author = c.userId || {};
            const username = author.username || "Unknown";
            const profilePicture = author.profilePicture || null;
            const initial = username.charAt(0).toUpperCase();

            return (
              <div key={c._id} className="flex gap-3 fade-in">
                <Link to={`/profile/${author._id || ""}`} className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 overflow-hidden hover:ring-2 hover:ring-blue-500/50 transition-all">
                  {profilePicture ? (
                    <img src={profilePicture} alt={username} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-blue-600 text-[10px] bg-blue-50 dark:bg-gray-800">
                      {initial}
                    </div>
                  )}
                </Link>
                <div className="flex-1">
                  <div className="bg-white dark:bg-gray-800 px-4 py-2 rounded-2xl rounded-tl-none border border-gray-100 dark:border-gray-700 shadow-sm transition-colors">
                    <Link to={`/profile/${author._id || ""}`} className="font-black text-xs text-gray-900 dark:text-gray-100 hover:text-blue-600 transition-colors">
                      {username}
                    </Link>
                    <p className="text-gray-700 dark:text-gray-300 text-sm mt-0.5 leading-relaxed">
                      {c.text}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-2 items-center bg-white dark:bg-gray-800 p-1 rounded-full border border-gray-200 dark:border-gray-700 shadow-inner">
        <input
          type="text"
          placeholder="Add a comment..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleComment();
          }}
          className="flex-1 bg-transparent border-none focus:ring-0 px-4 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
        />
        <button 
          onClick={handleComment}
          disabled={!text.trim() || loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 dark:disabled:bg-gray-800 text-white p-2 rounded-full transition-all active:scale-90"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <svg className="w-4 h-4 transform rotate-90" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
          )}
        </button>
      </div>
    </div>
  );
}