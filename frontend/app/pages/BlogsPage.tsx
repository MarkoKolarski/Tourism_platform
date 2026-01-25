import { useState, useEffect } from "react";
import { Link } from "react-router";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import ReactMarkdown from "react-markdown";

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
}

interface BlogsResponse {
  blogs: Blog[];
  total: number;
  page: string;
  limit: string;
}

export default function BlogsPage() {
  const { isAuthenticated, token } = useAuth();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalBlogs, setTotalBlogs] = useState(0);
  const limit = 10;

  const fetchBlogs = async (page: number = 1, search: string = "") => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      if (search.trim()) {
        params.append("search", search.trim());
      }

      const response = await fetch(`http://localhost:8004/api/blogs?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: BlogsResponse = await response.json();
      setBlogs(data.blogs || []);
      setTotalBlogs(parseInt(data.total as any) || 0);
    } catch (err) {
      console.error("Error fetching blogs:", err);
      setError("Failed to load blogs. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs(currentPage, searchTerm);
  }, [currentPage]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchBlogs(1, searchTerm);
  };

  const totalPages = Math.ceil(totalBlogs / limit);

  const formatContent = (content: string, maxLength: number = 200) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + "...";
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

  if (loading && blogs.length === 0) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/4 mb-6"></div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-gray-300 rounded h-32 mb-4"></div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Travel Blogs 📖
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Discover amazing travel stories and experiences from our community
          </p>
        </div>

        {/* Search and Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-md">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search blogs..."
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                🔍
              </button>
            </form>

            {isAuthenticated && (
              <Link
                to="/blogs/create"
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <span>✏️</span>
                Write a Blog
              </Link>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Blog Grid */}
        {blogs.length === 0 && !loading ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No blogs found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {searchTerm ? "Try adjusting your search terms" : "Be the first to share your travel story!"}
            </p>
            {isAuthenticated && (
              <Link
                to="/blogs/create"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <span>✏️</span>
                Write First Blog
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {blogs.map((blog) => (
              <div
                key={blog.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <Link
                        to={`/blogs/${blog.id}`}
                        className="text-xl font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        {blog.title}
                      </Link>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                        <span>👤 {blog.userName || "Anonymous"}</span>
                        <span>📅 {formatDate(blog.createdAt)}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          blog.status === 'published' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        }`}>
                          {blog.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {blog.description && (
                    <p className="text-gray-600 dark:text-gray-400 mb-3">
                      {blog.description}
                    </p>
                  )}

                  {/*<p className="text-gray-700 dark:text-gray-300 mb-4">
                    {formatContent(blog.content)}
                  </p>*/}
                  <p className="text-gray-700 dark:text-gray-300 mb-4">
                    <ReactMarkdown>{formatContent(blog.content)}</ReactMarkdown>
                  </p>

                  {blog.tags && blog.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {blog.tags.slice(0, 5).map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs font-medium"
                        >
                          #{tag}
                        </span>
                      ))}
                      {blog.tags.length > 5 && (
                        <span className="text-gray-500 text-xs">
                          +{blog.tags.length - 5} more
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        ❤️ {blog.likeCount || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        💬 {blog.commentCount || 0}
                      </span>
                    </div>

                    <Link
                      to={`/blogs/${blog.id}`}
                      className="px-4 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    >
                      Read More →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-8">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            
            <div className="flex gap-1">
              {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                const page = i + Math.max(1, currentPage - 2);
                if (page > totalPages) return null;
                
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 rounded ${
                      currentPage === page
                        ? "bg-blue-600 text-white"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Showing {blogs.length} of {totalBlogs} blogs
          {searchTerm && ` for "${searchTerm}"`}
        </div>
      </div>
    </Layout>
  );
}
