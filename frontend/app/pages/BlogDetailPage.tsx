import { useState, useEffect } from "react";
import { useParams, Link } from "react-router";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import ReactMarkdown from "react-markdown";

interface Comment {
  id: string;
  content: string;
  userId: string;
  userName: string;
  createdAt: string;
  updatedAt: string;
  replies?: Comment[];
}

interface Blog {
  id: string;
  title: string;
  content: string;
  description: string;
  userId: string;
  userName: string;
  createdAt: string;
  updatedAt: string;
  images: string[];
  tags: string[];
  likeCount: number;
  commentCount: number;
  status: string;
  comments: Comment[];
}

export default function BlogDetailPage() {
  const { id } = useParams();
  const { isAuthenticated, token, user } = useAuth();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const fetchBlog = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8004/api/blogs/${id}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: Blog = await response.json();
      setBlog(data);
    } catch (err) {
      console.error("Error fetching blog:", err);
      setError("Failed to load blog. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!isAuthenticated || !token) {
      alert("Please log in to like blogs");
      return;
    }

    try {
      const method = isLiked ? "DELETE" : "POST";
      const response = await fetch(`http://localhost:8004/api/blogs/${id}/like`, {
        method,
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        setIsLiked(!isLiked);
        setBlog(prev => prev ? {
          ...prev,
          likeCount: isLiked ? prev.likeCount - 1 : prev.likeCount + 1
        } : null);
      } else {
        const errorData = await response.json();
        console.error("Like error:", errorData);
      }
    } catch (err) {
      console.error("Error liking blog:", err);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !isAuthenticated || !token) return;

    setIsSubmittingComment(true);
    try {
      const response = await fetch(`http://localhost:8004/api/blogs/${id}/comments`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: newComment.trim(),
        }),
      });

      if (response.ok) {
        setNewComment("");
        // Refresh blog to get updated comments
        await fetchBlog();
      } else {
        const errorData = await response.json();
        console.error("Comment error:", errorData);
        alert("Failed to add comment");
      }
    } catch (err) {
      console.error("Error adding comment:", err);
      alert("Failed to add comment");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("sr-RS", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  useEffect(() => {
    if (id) {
      fetchBlog();
    }
  }, [id]);

  if (loading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-300 rounded w-1/4 mb-6"></div>
            <div className="space-y-3">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-300 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !blog) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="text-6xl mb-4">😕</div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Blog Not Found
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {error || "The blog you're looking for doesn't exist or has been removed."}
            </p>
            <Link
              to="/blogs"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              ← Back to Blogs
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <Link
            to="/blogs"
            className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← Back to Blogs
          </Link>
        </div>

        {/* Blog Content */}
        <article className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="p-8">
            {/* Header */}
            <header className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                {blog.title}
              </h1>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                <span className="flex items-center gap-1">
                  👤 {blog.userName || "Anonymous"}
                </span>
                <span className="flex items-center gap-1">
                  📅 {formatDate(blog.createdAt)}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  blog.status === 'published' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                }`}>
                  {blog.status}
                </span>
              </div>

              {blog.description && (
                <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
                  {blog.description}
                </p>
              )}

              {/* Tags */}
              {blog.tags && blog.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {blog.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </header>

            {/* Content */}
            <div className="prose prose-lg dark:prose-invert max-w-none mb-8">
              <ReactMarkdown>{blog.content}</ReactMarkdown>
              {/*<div className="whitespace-pre-wrap">{blog.content}</div>*/}
            </div>

            {/* Images */}
            {blog.images && blog.images.length > 0 && (
              <div className="mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {blog.images.map((image, index) => (
                    <img
                      key={index}
                      src={image}
                      alt={`Blog image ${index + 1}`}
                      className="w-full h-64 object-cover rounded-lg"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Like and Stats */}
            <div className="border-t dark:border-gray-700 pt-6 mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  {isAuthenticated ? (
                    <button
                      onClick={handleLike}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                        isLiked
                          ? "bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                      }`}
                    >
                      {isLiked ? "❤️" : "🤍"} {blog.likeCount}
                    </button>
                  ) : (
                    <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      ❤️ {blog.likeCount}
                    </span>
                  )}
                  
                  <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    💬 {blog.commentCount} Comments
                  </span>
                </div>

                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {blog.updatedAt !== blog.createdAt && (
                    <span>Updated {formatDate(blog.updatedAt)}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </article>

        {/* Comments Section */}
        <section className="mt-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Comments ({blog.commentCount})
          </h2>

          {/* Add Comment Form */}
          {isAuthenticated ? (
            <form onSubmit={handleCommentSubmit} className="mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Share your thoughts..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
                />
                <div className="flex justify-end mt-4">
                  <button
                    type="submit"
                    disabled={!newComment.trim() || isSubmittingComment}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmittingComment ? "Posting..." : "Post Comment"}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-8">
              <p className="text-blue-800 dark:text-blue-200">
                <Link to="/login" className="font-semibold underline">
                  Log in
                </Link>{" "}
                to join the conversation
              </p>
            </div>
          )}

          {/* Comments List */}
          {blog.comments && blog.comments.length > 0 ? (
            <div className="space-y-4">
              {blog.comments.map((comment) => (
                <div
                  key={comment.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {comment.userName || "Anonymous"}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(comment.createdAt)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {comment.content}
                  </div>

                  {/* Replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-4 ml-6 space-y-3">
                      {comment.replies.map((reply) => (
                        <div
                          key={reply.id}
                          className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-gray-900 dark:text-white text-sm">
                              {reply.userName || "Anonymous"}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDate(reply.createdAt)}
                            </span>
                          </div>
                          <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                            {reply.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
              <div className="text-4xl mb-4">💭</div>
              <p className="text-gray-600 dark:text-gray-400">
                No comments yet. Be the first to share your thoughts!
              </p>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
