import { useState, useEffect } from "react";
import { Link } from "react-router";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";

interface Tour {
  id: number;
  name: string;
  description: string;
  difficulty: number;
  tags: string[];
  price: number;
  status: string;
  total_length_km: number;
  author_id: number;
  created_at: string;
  updated_at: string;
}

export default function ToursPage() {
  const { isAuthenticated, user } = useAuth();
  // Add this for debugging:
  console.log("user", user);
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTours = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/tours-service/tours");

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setTours(data.tours || []);
    } catch (err) {
      console.error("Error fetching tours:", err);
      setError("Failed to load tours. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTours();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("sr-RS", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("sr-RS", {
      style: "currency",
      currency: "RSD"
    }).format(price);
  };

  const getDifficultyLabel = (difficulty: number) => {
    switch(difficulty) {
      case 1: return "Lako";
      case 2: return "Srednje";
      case 3: return "Teško";
      case 4: return "Vrlo teško";
      case 5: return "Ekstremno";
      default: return "Nepoznato";
    }
  };

  const getDifficultyColor = (difficulty: number) => {
    switch(difficulty) {
      case 1: return "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200";
      case 2: return "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200";
      case 3: return "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200";
      case 4: return "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200";
      case 5: return "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200";
      default: return "bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200";
    }
  };

  if (loading && tours.length === 0) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/4 mb-6"></div>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-gray-300 rounded h-48 mb-4"></div>
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
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Dostupne ture 🗺️
            </h1>
            {isAuthenticated && user?.role.toLowerCase() === "vodic" && (
              <div className="flex gap-2">
                <Link
                  to="/my-tours"
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Moje ture
                </Link>
                <Link
                  to="/tours/create"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  + Kreiraj turu
                </Link>
              </div>
            )}
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Otkrijte najbolje turističke ture u regionu
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Tours Grid */}
        {tours.length === 0 && !loading ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🗺️</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Nema pronađenih tura
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Trenutno nema dostupnih tura
            </p>
            {isAuthenticated && user?.role.toLowerCase() === "vodic" && (
              <Link
                to="/tours/create"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                + Kreiraj prvu turu
              </Link>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tours.map((tour) => (
              <div
                key={tour.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400"
              >
                {/* Header with image placeholder */}
                <div className="h-48 bg-gradient-to-br from-blue-500 to-purple-600 relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-white text-6xl">🗺️</div>
                  </div>
                  <div className="absolute top-4 right-4">
                    {getStatusBadge(tour.status)}
                  </div>
                  {tour.price > 0 && (
                    <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg shadow-lg">
                      <div className="text-xs text-gray-600 dark:text-gray-400">Cena</div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {formatPrice(tour.price)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-6">
                  {/* Title */}
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-2">
                    {tour.name}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-3 text-sm">
                    {tour.description}
                  </p>

                  {/* Details */}
                  <div className="space-y-3 mb-4">
                    {/* Difficulty */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Težina:</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getDifficultyColor(tour.difficulty)}`}>
                        {getDifficultyLabel(tour.difficulty)}
                      </span>
                    </div>

                    {/* Length */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Dužina:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {tour.total_length_km.toFixed(1)} km
                      </span>
                    </div>
                  </div>

                  {/* Tags */}
                  {tour.tags && tour.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {tour.tags.slice(0, 3).map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-medium"
                        >
                          #{tag}
                        </span>
                      ))}
                      {tour.tags.length > 3 && (
                        <span className="px-2 py-1 bg-gray-50 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400 rounded text-xs">
                          +{tour.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(tour.created_at)}
                    </div>
                    <Link
                      to={`/tours/${tour.id}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm hover:shadow-md"
                    >
                      Detalji
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
