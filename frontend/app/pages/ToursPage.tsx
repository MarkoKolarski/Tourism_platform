import { useState, useEffect } from "react";
import { Link } from "react-router";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";

export interface KeyPoint {
  id?: number;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  image_url?: string;
  order: number;
}
export enum TourStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived'
}
export interface Tour {
  id: number;
  name: string;
  description: string;
  difficulty: number;
  tags: string[];
  price: number;
  status: TourStatus;
  total_length_km: number;
  author_id: number;
  published_at: string | null;
  archived_at: string | null;
  created_at: string;
  first_keypoint?: KeyPoint;
}

export default function ToursPage() {
  const { isAuthenticated, token } = useAuth();
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTours, setTotalTours] = useState(0);
  const limit = 10;

  const fetchTours = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/v1/tours/status/published/");
      //const response = await fetch(`http://localhost:8005/api/tours/status/published/`);
      //const response = await fetch(`/api/tours/published?page=${currentPage}&limit=${limit}&search=${searchTerm}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setTours(data.tours || []);
      setTotalTours(data.total || 0);
    } catch (err) {
      console.error("Error fetching tours:", err);
      setError("Failed to load tours. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTours();
  }, [currentPage]);


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("sr-RS", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };
  const totalPages = Math.ceil(totalTours / limit);

  const getDifficultyLabel = (difficulty: number) => {
    switch(difficulty) {
      case 1: return "Lako";
      case 2: return "Srednje";
      case 3: return "Teško";
      default: return "Nepoznato";
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Dostupne ture 🗺️
          </h1>
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
              {searchTerm ? "Pokušajte drugačiji termin pretrage" : "Trenutno nema dostupnih tura"}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tours.map((tour) => (
              <div
                key={tour.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      {tour.name}
                    </h3>
                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-xs font-medium">
                      Objavljena
                    </span>
                  </div>

                  <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                    {tour.description}
                  </p>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Težina:</span>
                      <span className="font-medium">{getDifficultyLabel(tour.difficulty)}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Dužina:</span>
                      <span className="font-medium">{tour.total_length_km.toFixed(1)} km</span>
                    </div>

                    {tour.first_keypoint && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Početna tačka:</span>
                        <span className="font-medium text-sm">{tour.first_keypoint.name}</span>
                      </div>
                    )}
                  </div>

                  {tour.tags && tour.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {tour.tags.slice(0, 3).map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(tour.created_at)}
                    </div>
                    <Link
                      to={`/tours/${tour.id}`}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      Pogledaj detalje
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
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50"
            >
              ← Prethodna
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
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50"
            >
              Sledeća →
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}