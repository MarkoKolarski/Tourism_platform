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
  const [filteredTours, setFilteredTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);
  
  // State za filtere
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("newest");

  // Redirect if not VODIC
  if (user?.role.toLowerCase() !== "vodic") {
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
      setFilteredTours(data.tours || []);
    } catch (err) {
      console.error("Error fetching tours:", err);
      setError("Failed to load your tours");
    } finally {
      setLoading(false);
    }
  };

  // Funkcija za filtriranje i sortiranje tura
  const applyFiltersAndSort = () => {
    let result = [...tours];

    // Filter po statusu
    if (statusFilter !== "all") {
      result = result.filter(tour => tour.status === statusFilter);
    }

    // Filter po pretrazi
    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      result = result.filter(tour => 
        tour.name.toLowerCase().includes(term) ||
        tour.description.toLowerCase().includes(term) ||
        tour.tags.some(tag => tag.toLowerCase().includes(term))
      );
    }

    // Sortiranje
    result.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "name_asc":
          return a.name.localeCompare(b.name);
        case "name_desc":
          return b.name.localeCompare(a.name);
        case "price_asc":
          return a.price - b.price;
        case "price_desc":
          return b.price - a.price;
        case "length_asc":
          return a.total_length_km - b.total_length_km;
        case "length_desc":
          return b.total_length_km - a.total_length_km;
        default:
          return 0;
      }
    });

    setFilteredTours(result);
  };

  useEffect(() => {
    applyFiltersAndSort();
  }, [statusFilter, searchTerm, sortBy, tours]);

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

  const getStatusCounts = () => {
    const counts = {
      all: tours.length,
      draft: tours.filter(t => t.status === 'draft').length,
      published: tours.filter(t => t.status === 'published').length,
      archived: tours.filter(t => t.status === 'archived').length
    };
    return counts;
  };

  const statusCounts = getStatusCounts();

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

        {/* Filter sekcija */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Pretraga */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Pretraži ture
              </label>
              <input
                type="text"
                placeholder="Pretraži po nazivu, opisu ili tagovima..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Filter po statusu */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Filter po statusu
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${statusFilter === "all" ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200" : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300"}`}
                >
                  Sve ({statusCounts.all})
                </button>
                <button
                  onClick={() => setStatusFilter("draft")}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${statusFilter === "draft" ? "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200" : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300"}`}
                >
                  Draft ({statusCounts.draft})
                </button>
                <button
                  onClick={() => setStatusFilter("published")}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${statusFilter === "published" ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200" : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300"}`}
                >
                  Objavljene ({statusCounts.published})
                </button>
                <button
                  onClick={() => setStatusFilter("archived")}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${statusFilter === "archived" ? "bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200" : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300"}`}
                >
                  Arhivirane ({statusCounts.archived})
                </button>
              </div>
            </div>

            {/* Sortiranje */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sortiraj po
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              >
                <option value="newest">Najnovije</option>
                <option value="oldest">Najstarije</option>
                <option value="name_asc">Naziv (A-Z)</option>
                <option value="name_desc">Naziv (Z-A)</option>
                <option value="price_asc">Cena (niža-viša)</option>
                <option value="price_desc">Cena (viša-niža)</option>
                <option value="length_asc">Dužina (kraće-duže)</option>
                <option value="length_desc">Dužina (duže-kraće)</option>
              </select>
            </div>
          </div>

          {/* Statistika */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{statusCounts.all}</div>
              <div className="text-sm text-blue-800 dark:text-blue-300">Ukupno tura</div>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{statusCounts.draft}</div>
              <div className="text-sm text-yellow-800 dark:text-yellow-300">Draft tura</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{statusCounts.published}</div>
              <div className="text-sm text-green-800 dark:text-green-300">Objavljeno</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/20 p-4 rounded-lg">
              <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">{statusCounts.archived}</div>
              <div className="text-sm text-gray-800 dark:text-gray-300">Arhivirano</div>
            </div>
          </div>
        </div>

        {filteredTours.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {tours.length === 0 ? "Nemate kreiranih tura" : "Nema pronađenih tura"}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {tours.length === 0 
                ? "Kreirajte svoju prvu turu da počnete"
                : "Pokušajte da promenite filtere ili pretragu"}
            </p>
            {tours.length === 0 && (
              <Link
                to="/tours/create"
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Kreiraj prvu turu
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-6">
            <div className="text-gray-600 dark:text-gray-400 text-sm">
              Prikazano {filteredTours.length} od {tours.length} tura
            </div>
            
            {filteredTours.map((tour) => (
              <div
                key={tour.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700"
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
                      ID: {tour.id} • Ažurirano: {formatDate(tour.updated_at)}
                    </span>
                    <div className="flex gap-2">
                      <Link
                        to={`/tours/edit/${tour.id}`}
                        className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        Uredi osnovne podatke
                      </Link>
                      <Link
                        to={`/tours/${tour.id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Pogledaj detalje →
                      </Link>
                    </div>
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
