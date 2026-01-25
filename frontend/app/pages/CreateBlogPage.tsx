import { useState } from "react";
import { useNavigate, Link } from "react-router";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import MarkdownEditor from "../components/MarkdownEditor";

export default function CreateBlogPage() {
  const navigate = useNavigate();
  const { isAuthenticated, token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    content: "",
    tags: "",
    images: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated || !token) {
      setError("Please log in to create a blog");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Process tags and images
      const tags = formData.tags
        .split(",")
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
      
      const images = formData.images
        .split("\n")
        .map(img => img.trim())
        .filter(img => img.length > 0);

      const response = await fetch("http://localhost:8004/api/blogs", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          content: formData.content,
          tags: tags,
          images: images
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create blog");
      }

      const newBlog = await response.json();
      
      // Navigate to the new blog
      navigate(`/blogs/${newBlog.id}`);
    } catch (err) {
      console.error("Error creating blog:", err);
      setError(err instanceof Error ? err.message : "Failed to create blog");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Authentication Required
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              You need to be logged in to create a blog post.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Login to Continue
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link
              to="/blogs"
              className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
            >
              ← Back to Blogs
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Write a New Blog Post ✍️
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Share your travel experiences and stories with the community
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            {/* Title */}
            <div className="mb-6">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Blog Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                placeholder="Enter an engaging title for your blog post..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-lg"
              />
            </div>

            {/* Description */}
            <div className="mb-6">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Short Description
              </label>
              <input
                type="text"
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="A brief summary of your blog post..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Content */}
            <div className="mb-6">
                <MarkdownEditor
            label="Sadržaj bloga *"
            value={formData.content}
            onChange={(content) => setFormData({ ...formData, content })}
            placeholder="Share your travel story, experiences, tips, or insights...
Use Markdown formatting.
You can include:
- Your journey details
- Places you visited
- Local cuisine you tried  
- Cultural experiences
- Travel tips and recommendations
- Photo descriptions"
          />
              {/*<label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Blog Content *
              </label>
              <textarea
                id="content"
                name="content"
                value={formData.content}
                onChange={handleChange}
                required
                rows={12}
                placeholder="Share your travel story, experiences, tips, or insights...

You can include:
- Your journey details
- Places you visited
- Local cuisine you tried  
- Cultural experiences
- Travel tips and recommendations
- Photo descriptions"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
              />*/}
            </div>

            {/* Tags */}
            <div className="mb-6">
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tags
              </label>
              <input
                type="text"
                id="tags"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                placeholder="travel, adventure, europe, food, culture (separated by commas)"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Add relevant tags separated by commas to help others discover your post
              </p>
            </div>

            {/* Images */}
            <div className="mb-6">
              <label htmlFor="images" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Image URLs
              </label>
              <textarea
                id="images"
                name="images"
                value={formData.images}
                onChange={handleChange}
                rows={4}
                placeholder="https://example.com/image1.jpg
https://example.com/image2.jpg
(one URL per line)"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
              />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Add image URLs (one per line) to include photos in your blog post
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-end">
            <Link
              to="/blogs"
              className="px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-center"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || !formData.title.trim() || !formData.content.trim()}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creating...
                </>
              ) : (
                <>
                  <span>📝</span>
                  Create Blog Post
                </>
              )}
            </button>
          </div>
        </form>

        {/* Preview Info */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-2">
            📋 Writing Tips
          </h3>
          <ul className="space-y-1 text-blue-800 dark:text-blue-200 text-sm">
            <li>• Write an engaging title that captures the essence of your journey</li>
            <li>• Include specific details about places, experiences, and recommendations</li>
            <li>• Use relevant tags to help other travelers discover your content</li>
            <li>• Add high-quality images to make your post more engaging</li>
            <li>• Your blog will be saved as a draft and can be published later</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}
