import { useState, useContext, useRef, memo } from "react";
import { Link } from "react-router-dom";
import API from "../utils/api";
import CommentSection from "./CommentSection";
import { AuthContext } from "../context/AuthContext";

const PostCard = memo(({ post, onPostDelete, onPostUpdate }) => {
  const { user } = useContext(AuthContext);
  const [likesCount, setLikesCount] = useState(post.likes?.length || 0);
  const [commentCount, setCommentCount] = useState(post.comments?.length || 0);
  const [isLiked, setIsLiked] = useState(user ? post.likes?.includes(user._id || user.id) : false);
  const [showComments, setShowComments] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editText, setEditText] = useState(post.text || "");
  const [editImageFile, setEditImageFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(post.image || "");
  const fileInputRef = useRef(null);

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      await API.delete(`/posts/${post._id}`);
      if (onPostDelete) onPostDelete();
    } catch (err) {
      console.error("Failed to delete post");
    }
    setShowDropdown(false);
  };

  const handleEditSubmit = async () => {
    if (!editText.trim() && !previewImage && !editImageFile) return;

    setEditLoading(true);
    try {
      const formData = new FormData();
      formData.append("text", editText);
      if (editImageFile) {
        formData.append("image", editImageFile);
      }

      const res = await API.put(`/posts/${post._id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      setIsEditing(false);
      setEditImageFile(null);
      if (onPostUpdate) onPostUpdate(res.data.post);
    } catch (err) {
      console.error("Failed to update post", err);
    } finally {
      setEditLoading(false);
    }
  };

  const handleLike = async () => {
    const prevLiked = isLiked;
    const prevCount = likesCount;
    
    setIsLiked(!isLiked);
    setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);

    try {
      const res = await API.post(`/posts/${post._id}/like`);
      if (res.data && res.data.likesCount !== undefined) {
        setLikesCount(res.data.likesCount);
      }
    } catch (err) {
      setIsLiked(prevLiked);
      setLikesCount(prevCount);
    }
  };

  const handleDownload = async () => {
    if (!post.image) return;
    try {
      const response = await fetch(post.image);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `post-image-${post._id}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed", err);
    }
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setEditImageFile(file);
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const author = post.userId || {};
  const username = author.username || "Unknown User";
  const profilePicture = author.profilePicture || null;
  const initial = username.charAt(0).toUpperCase();

  const isOwner = user && (user._id === author._id || user.id === author._id);

  if (isEditing) {
    return (
      <div className="card p-6 mb-8 fade-in">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2.5 0 113.536 3.536L12 14.036H8v-4z" /></svg>
          </div>
          <h3 className="font-bold text-zinc-900 dark:text-white text-lg">Edit Post</h3>
        </div>
        <textarea
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          rows={3}
          className="input-field mb-6 resize-none leading-relaxed"
          placeholder="What's on your mind?"
        />
        
        {previewImage && (
          <div className="relative group mb-6 overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <img src={previewImage} alt="preview" className="w-full h-auto max-h-[600px] object-contain bg-zinc-50 dark:bg-zinc-950" />
            <button 
              onClick={() => {
                setPreviewImage("");
                setEditImageFile(null);
              }}
              className="absolute top-4 right-4 bg-white/90 hover:bg-white text-zinc-900 rounded-full w-9 h-9 flex items-center justify-center shadow-xl transition-all hover:scale-110 active:scale-95"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}

        <div className="flex items-center justify-between border-t dark:border-zinc-800 pt-6">
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 hover:text-blue-600 transition-colors font-bold text-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            Change Image
          </button>
          <input 
            type="file" 
            accept="image/*" 
            ref={fileInputRef}
            onChange={handleImageChange}
            className="hidden"
          />
          <div className="flex gap-3">
            <button 
              onClick={() => setIsEditing(false)}
              className="px-6 py-2.5 text-sm font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleEditSubmit}
              disabled={editLoading}
              className="btn-primary py-2.5 px-8"
            >
              {editLoading ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card mb-8 overflow-hidden fade-in border-zinc-200/60 dark:border-zinc-800/60">
      {/* Post Header */}
      <div className="flex justify-between items-center p-4">
        <Link to={`/profile/${author._id}`} className="flex items-center gap-3 group">
          <div className="w-11 h-11 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 p-0.5">
            <div className="w-full h-full rounded-full bg-white dark:bg-zinc-950 flex items-center justify-center overflow-hidden">
              {profilePicture ? (
                <img src={profilePicture} alt={username} className="w-full h-full object-cover" />
              ) : (
                <span className="text-blue-600 font-bold text-sm">{initial}</span>
              )}
            </div>
          </div>
          <div>
            <h4 className="font-bold text-zinc-900 dark:text-white group-hover:text-blue-600 transition-colors leading-none">{username}</h4>
            <p className="text-[10px] font-bold text-zinc-400 mt-1.5 uppercase">
              {new Date(post.createdAt).toLocaleDateString()} at {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-1">
          {post.image && (
            <button 
              onClick={handleDownload}
              className="text-zinc-400 hover:text-blue-600 p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
              title="Download image"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            </button>
          )}
          
          {isOwner && (
            <div className="relative">
              <button 
                onClick={() => setShowDropdown(!showDropdown)}
                className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" /></svg>
              </button>
              
              {showDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)}></div>
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl py-2 z-20 border border-zinc-100 dark:border-zinc-800 fade-in">
                    <button 
                      onClick={() => { setIsEditing(true); setShowDropdown(false); }}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                    >
                      Edit Post
                    </button>
                    <button 
                      onClick={handleDelete}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                    >
                      Delete Post
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Post Content */}
      <div className="px-4 pb-4">
        {post.text && <p className="text-zinc-800 dark:text-zinc-200 text-base leading-relaxed whitespace-pre-wrap">{post.text}</p>}
      </div>
      
      {post.image && (
        <div className="bg-zinc-50 dark:bg-black/40 border-y border-zinc-100 dark:border-zinc-800 flex justify-center">
          <img 
            src={post.image} 
            alt="post content" 
            className="w-full h-auto max-h-[800px] object-contain" 
          />
        </div>
      )}

      {/* Post Actions */}
      <div className="px-4 py-3 flex items-center gap-6 border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/20 dark:bg-zinc-900/20">
        <button 
          onClick={handleLike} 
          className={`flex items-center gap-2.5 transition-all group ${isLiked ? 'text-red-500' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'}`}
        >
          <div className={`p-2 rounded-full transition-colors ${isLiked ? 'bg-red-50 dark:bg-red-900/10' : 'group-hover:bg-zinc-100 dark:group-hover:bg-zinc-800'}`}>
            {isLiked ? (
              <svg className="h-5 w-5 animate-bounce-once" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
            )}
          </div>
          <span className="text-sm font-bold">{likesCount}</span>
        </button>

        <button 
          onClick={() => setShowComments(!showComments)} 
          className="flex items-center gap-2.5 transition-all group text-zinc-400 dark:text-zinc-500 hover:text-blue-500 dark:hover:text-blue-400"
        >
          <div className="p-2 rounded-full transition-colors group-hover:bg-blue-50 dark:group-hover:bg-blue-900/10">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
          </div>
          <span className="text-sm font-bold">{commentCount}</span>
        </button>
      </div>
      
      {/* Comments Section */}
      {showComments && (
        <div className="p-5 border-t dark:border-zinc-800 bg-zinc-50/50 dark:bg-black/20">
          <CommentSection post={post} onCommentAdded={(newCount) => setCommentCount(newCount)} />
        </div>
      )}
    </div>
  );
});

export default PostCard;