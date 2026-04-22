import { useState, useRef, useContext } from "react";
import API from "../utils/api";
import { AuthContext } from "../context/AuthContext";

export default function CreatePost({ refresh }) {
  const { user } = useContext(AuthContext);
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [previewImage, setPreviewImage] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setPreviewImage("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handlePost = async () => {
    if (!text.trim() && !imageFile) return;

    setLoading(true);
    try {
      const formData = new FormData();
      if (text.trim()) formData.append("text", text);
      if (imageFile) formData.append("image", imageFile);

      await API.post("/posts", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setText("");
      handleRemoveImage();
      refresh();
    } catch (err) {
      console.error("Error creating post:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card overflow-hidden transition-all duration-300 ring-0 focus-within:ring-2 focus-within:ring-blue-500/10 mb-8">
      <div className="p-5 flex gap-4">
        {/* User Avatar */}
        <div className="w-11 h-11 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 overflow-hidden shrink-0 flex items-center justify-center">
          {user?.profilePicture ? (
            <img src={user.profilePicture} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-bold text-blue-600 text-sm">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col gap-4">
          <textarea
            placeholder={`What's on your mind, ${user?.username?.split(' ')[0]}?`}
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full resize-none bg-transparent border-none focus:ring-0 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 p-0 pt-2 text-lg leading-relaxed font-medium"
          ></textarea>
          
          {previewImage && (
            <div className="relative group overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-lg bg-zinc-50 dark:bg-zinc-950">
              <img src={previewImage} alt="preview" className="w-full h-auto max-h-[600px] object-contain" />
              <button 
                onClick={handleRemoveImage}
                className="absolute top-4 right-4 bg-white/90 hover:bg-white text-zinc-900 rounded-full w-9 h-9 flex items-center justify-center shadow-xl transition-all hover:scale-110 active:scale-95"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}

          <div className="flex justify-between items-center pt-2 border-t dark:border-zinc-800/50">
            <div className="flex gap-1">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-4 py-2.5 rounded-xl transition-all group active:scale-95"
                title="Add Image"
              >
                <svg className="w-6 h-6 text-green-500 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-xs font-bold uppercase tracking-widest">Image</span>
              </button>
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef}
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
            
            <button 
              onClick={handlePost} 
              disabled={(!text.trim() && !imageFile) || loading}
              className="btn-primary py-2.5 px-8 disabled:bg-zinc-200 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-600 shadow-blue-600/10"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : "Post"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}