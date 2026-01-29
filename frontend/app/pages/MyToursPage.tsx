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

export default function MyToursPage() {
  const { token, user } = useAuth();
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);

  // Redirect if not VODIC
  if (user?.role.toUpperCase() !== "VODIC") {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
            <div className="text-6xl mb-4">🚫</div>
            <h2 className="text-2xl font-bold text-red-800 dark:text-red-200 mb-2">
              Nemate dozvolu
            </h2>
            <p className="text-red-600 dark:text-red-300">
              Samo vodiči mogu upravljati turama.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  const fetchMyTours = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/v1/tours/my", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch tours");
      }

      const data = await response.json();
      setTours(data.tours || []);
    } catch (err) {
      console.error("Error fetching tours:", err);
      setError("Failed to load your tours");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (tourId: number) => {
    if (!confirm("Da li ste sigurni da želite da obrišete ovu turu?")) {
      return;
    }

    try {
      setDeleteLoading(tourId);
      const response = await fetch(`/api/v1/tours/${tourId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to delete tour");
      }

      setTours(tours.filter(tour => tour.id !== tourId));
    } catch (err) {
      console.error("Error deleting tour:", err);
      setError("Failed to delete tour");
    } finally {
      setDeleteLoading(null);
    }
  };

  useEffect(() => {
    fetchMyTours();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("sr-RS", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  const getDifficultyLabel = (difficulty: number) => {
    switch(difficulty) {
      case 1: return "Lako";
      case 2: return "Srednje";
      case 3: return "Teško";
      default: return "Nepoznato";
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'draft':
        return <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-full text-xs font-medium">Draft</span>;
      case 'published':
        return <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-xs font-medium">Objavljena</span>;
      case 'archived':
        return <span className="px-3 py-1 bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-full text-xs font-medium">Arhivirana</span>;
      default:
        return null;
    }
  };

  if (loading) {
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Moje ture 🗺️
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Upravljajte vašim turama
            </p>
          </div>
          <Link
            to="/tours/create"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Kreiraj novu turu
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {tours.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🗺️</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Nemate kreiranih tura
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Kreirajte svoju prvu turu da počnete
            </p>
            <Link
              to="/tours/create"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Kreiraj prvu turu
            </Link>
          </div>
        ) : (
          <div className="grid gap-6">
            {tours.map((tour) => (
              <div
                key={tour.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                          {tour.name}
                        </h3>
                        {getStatusBadge(tour.status)}
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 line-clamp-2">
                        {tour.description}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Link
                        to={`/tours/manage/${tour.id}`}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        Upravljaj →
                      </Link>
                      <button
                        onClick={() => handleDelete(tour.id)}
                        disabled={deleteLoading === tour.id}
                        className="px-3 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded text-sm hover:bg-red-200 dark:hover:bg-red-800 transition-colors disabled:opacity-50"
                      >
                        {deleteLoading === tour.id ? "..." : "🗑️ Obriši"}
                      </button>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">Težina:</span>
                      <div className="font-medium">{getDifficultyLabel(tour.difficulty)}</div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">Dužina:</span>
                      <div className="font-medium">{tour.total_length_km.toFixed(1)} km</div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">Cena:</span>
                      <div className="font-medium">{tour.price.toFixed(2)} RSD</div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">Kreirana:</span>
                      <div className="font-medium text-sm">{formatDate(tour.created_at)}</div>
                    </div>
                  </div>

                  {tour.tags && tour.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {tour.tags.map((tag, index) => (
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
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      ID: {tour.id}
                    </span>
                    <Link
                      to={`/tours/${tour.id}`}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Pogledaj detalje →
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
