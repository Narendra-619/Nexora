import { useState, useEffect, useContext, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import API from "../utils/api";
import { AuthContext } from "../context/AuthContext";
import PostCard from "../components/PostCard";

const Profile = () => {
  const { userId } = useParams();
  const { user: currentUser, updateUser } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editImage, setEditImage] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [updateLoading, setUpdateLoading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      const res = await API.get(`/users/${userId}`);
      setProfile(res.data.user);
      setPosts(res.data.posts);
      setEditUsername(res.data.user.username);
      setEditBio(res.data.user.bio);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching profile", err);
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setUpdateLoading(true);
    const formData = new FormData();
    formData.append("username", editUsername);
    formData.append("bio", editBio);
    if (editImage) {
      formData.append("profilePicture", editImage);
    }

    try {
      const res = await API.put("/users/profile", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setProfile(res.data.user);
      if (updateUser) {
        updateUser(res.data.user);
      }
      setIsEditing(false);
      setEditImage(null);
      setPreviewImage(null);
    } catch (err) {
      console.error("Error updating profile", err);
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setEditImage(file);
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  if (loading) return (
    <div className="flex justify-center py-24">
      <div className="animate-spin rounded-full h-12 w-12 border-2 border-zinc-200 dark:border-zinc-800 border-t-blue-600"></div>
    </div>
  );
  
  if (!profile) return (
    <div className="max-w-xl mx-auto py-24 text-center px-6">
      <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800 rounded-3xl flex items-center justify-center mx-auto mb-6 text-zinc-400">
         <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 9.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      </div>
      <h2 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">User not found</h2>
      <p className="text-zinc-500 dark:text-zinc-400 mt-2 font-medium">This profile does not exist.</p>
      <Link to="/feed" className="btn-primary mt-8 inline-block px-10">Back to Feed</Link>
    </div>
  );

  const isOwnProfile = currentUser && (currentUser._id === userId || currentUser.id === userId);

  return (
    <div className="max-w-xl mx-auto py-10 px-4 sm:px-0">
      {/* Profile Header */}
      <div className="card overflow-hidden mb-10 fade-in border-zinc-200/60 dark:border-zinc-800/60">
        <div className="h-40 bg-gradient-to-br from-zinc-100 to-zinc-300 dark:from-zinc-800 dark:to-black"></div>
        <div className="px-8 pb-8 relative">
          <div className="flex justify-between items-end -mt-14 mb-6">
            <div className="relative">
              <div className="w-28 h-28 rounded-full border-4 border-zinc-50 dark:border-zinc-900 bg-white dark:bg-zinc-950 overflow-hidden shadow-2xl">
                {profile.profilePicture ? (
                  <img src={profile.profilePicture} alt={profile.username} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl text-blue-600 font-bold bg-blue-50 dark:bg-zinc-900">
                    {profile.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex gap-3 mb-2">
              {isOwnProfile ? (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="px-8 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 font-bold uppercase text-xs tracking-widest rounded-2xl transition-all shadow-sm hover:shadow-lg active:scale-95"
                >
                  Edit Profile
                </button>
              ) : (
                <Link 
                  to="/messenger"
                  state={{ startChatWith: profile }}
                  className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase text-xs tracking-widest rounded-2xl transition-all shadow-xl shadow-blue-600/20 active:scale-95"
                >
                  Message
                </Link>
              )}
            </div>
          </div>

          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">{profile.username}</h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-2 font-medium text-base leading-relaxed whitespace-pre-wrap max-w-lg">
              {profile.bio || "No bio available."}
            </p>
          </div>
          
          <div className="mt-8 flex gap-8 border-t dark:border-zinc-800 pt-6">
            <div className="text-center">
              <span className="block font-bold text-zinc-900 dark:text-white text-lg">{posts.length}</span>
              <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Posts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-zinc-950/80 backdrop-blur-xl fade-in">
          <div className="card w-full max-w-md p-8 shadow-2xl relative border-zinc-200 dark:border-zinc-800">
            <button 
              onClick={() => setIsEditing(false)}
              className="absolute top-6 right-6 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all active:scale-75"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            <h2 className="text-2xl font-bold mb-8 text-zinc-900 dark:text-white tracking-tight">Edit Profile</h2>
            <form onSubmit={handleEditSubmit} className="space-y-6">
              <div className="flex justify-center mb-8">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-dashed border-zinc-300 dark:border-zinc-700 p-1.5 transition-all group-hover:border-blue-500">
                    <img 
                      src={previewImage || profile.profilePicture || "https://via.placeholder.com/150"} 
                      className="w-full h-full rounded-full object-cover transition-all group-hover:brightness-50"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                       <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </div>
                  </div>
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2 px-1">User ID</label>
                <input 
                  type="text" 
                  value={editUsername} 
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2 px-1">Bio</label>
                <textarea 
                  value={editBio} 
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={3}
                  className="input-field resize-none leading-relaxed"
                  placeholder="Tell us about yourself..."
                />
              </div>
              <div className="pt-4">
                <button 
                  type="submit"
                  disabled={updateLoading}
                  className="btn-primary w-full shadow-blue-600/10"
                >
                  {updateLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Section */}
      <div className="flex items-center gap-4 mb-8">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-white tracking-tight uppercase">Recent Posts</h2>
        <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1"></div>
      </div>

      <div className="space-y-4">
        {posts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-zinc-500 dark:text-zinc-400 font-medium italic">No posts yet.</p>
          </div>
        ) : (
          posts.map(post => (
            <PostCard 
              key={post._id} 
              post={post} 
              onPostDelete={() => setPosts(posts.filter(p => p._id !== post._id))}
              onPostUpdate={(updatedPost) => setPosts(posts.map(p => p._id === updatedPost._id ? updatedPost : p))}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default Profile;
