import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../utils/api";
import PostCard from "../components/PostCard";

export default function PostPage() {
  const { postId } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const res = await API.get(`/posts/${postId}`);
        setPost(res.data);
      } catch (err) {
        console.error("Failed to load post");
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [postId]);

  if (loading) return <div className="flex justify-center mt-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  if (!post) return <div className="text-center mt-10 text-gray-500 dark:text-gray-400">Post not found</div>;

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8">
      <button onClick={() => navigate(-1)} className="mb-4 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition flex items-center gap-1 font-medium">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back
      </button>
      <PostCard 
        post={post} 
        onPostDelete={() => navigate("/feed")}
        onPostUpdate={(updatedPost) => setPost(updatedPost)}
      />
    </div>
  );
}
