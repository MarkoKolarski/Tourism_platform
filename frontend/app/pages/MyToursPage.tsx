import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";

interface KeyPoint {
  id: number;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  image_url: string;
  order: number;
}

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
  keypoints?: KeyPoint[];
}

export default function MyToursPage() {
  const { token, user, isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [tours, setTours] = useState<Tour[]>([]);
  const [filteredTours, setFilteredTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);
  
  // State za filtere
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("newest");

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || user?.role.toLowerCase() !== "vodic") {
      navigate("/", { replace: true });
    }
  }, [isLoading, isAuthenticated, user, navigate]);

  const fetchMyTours = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const response = await fetch("/api/tours-service/tours/my", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch tours");
      }

      const data = await response.json();
      const toursWithKeypoints = await Promise.all(
        (data.tours || []).map(async (tour: Tour) => {
          try {
            const kpResponse = await fetch(`/api/tours-service/tours/${tour.id}/keypoints`);
            if (kpResponse.ok) {
              const kpData = await kpResponse.json();
              return { ...tour, keypoints: kpData.keypoints || [] };
            }
          } catch (err) {
            console.error(`Failed to fetch keypoints for tour ${tour.id}:`, err);
          }
          return { ...tour, keypoints: [] };
        })
      );
      
      setTours(toursWithKeypoints);
      setFilteredTours(toursWithKeypoints);
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
      const response = await fetch(`/api/tours-service/tours/${tourId}`, {
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
    if (!isLoading && token) {
      fetchMyTours();
    }
  }, [isLoading, token]);

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

  if (isLoading || !user) {
    return (
      <Layout>
        <div className="text-center py-12">
          <div className="spinner mx-auto"></div>
        </div>
      </Layout>
    );
  }

  if (user.role.toLowerCase() !== "vodic") {
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
          <div className="space-y-6">
            <div className="text-gray-600 dark:text-gray-400 text-sm">
              Prikazano {filteredTours.length} od {tours.length} tura
            </div>
            
            {filteredTours.map((tour) => (
              <div
                key={tour.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300"
              >
                <div className="flex flex-col lg:flex-row">
                  {/* Large tour image - left side */}
                  <div className="lg:w-72 lg:flex-shrink-0">
                    {tour.keypoints?.[0]?.image_url ? (
                      <img 
                        src={tour.keypoints[0].image_url} 
                        alt={tour.keypoints[0].name}
                        className="w-full h-48 lg:h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-48 lg:h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Content - right side */}
                  <div className="flex-1 p-6">
                    {/* Header with title and status */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <Link
                          to={`/tours/${tour.id}`}
                          className="text-2xl font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors block mb-2"
                        >
                          {tour.name} →
                        </Link>
                        <div className="flex items-center gap-3">
                          {getStatusBadge(tour.status)}
                          <span className="text-sm text-gray-500 dark:text-gray-400">ID: {tour.id}</span>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                      {tour.description}
                    </p>

                    {/* Tour stats grid */}
                    <div className="grid grid-cols-4 gap-3 mb-4">
                      <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="text-lg font-bold text-gray-900 dark:text-white">
                          {getDifficultyLabel(tour.difficulty)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Težina</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="text-lg font-bold text-gray-900 dark:text-white">
                          {tour.total_length_km.toFixed(1)} km
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Dužina</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="text-lg font-bold text-gray-900 dark:text-white">
                          {tour.price.toFixed(0)} RSD
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Cena</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="text-lg font-bold text-gray-900 dark:text-white">
                          {tour.keypoints?.length || 0}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Tačke</div>
                      </div>
                    </div>

                    {/* Keypoints preview - horizontal scroll */}
                    {tour.keypoints && tour.keypoints.length > 0 && (
                      <div className="mb-4">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                          Ključne tačke:
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {tour.keypoints.slice(0, 5).map((kp) => (
                            <div key={kp.id} className="flex-shrink-0 flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs">
                                {kp.order}
                              </div>
                              {kp.image_url && (
                                <img 
                                  src={kp.image_url} 
                                  alt={kp.name}
                                  className="w-10 h-10 rounded object-cover"
                                />
                              )}
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                {kp.name}
                              </span>
                            </div>
                          ))}
                          {tour.keypoints.length > 5 && (
                            <div className="flex-shrink-0 flex items-center px-3 text-sm text-gray-500 dark:text-gray-400">
                              +{tour.keypoints.length - 5}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Tags */}
                    {tour.tags && tour.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {tour.tags.slice(0, 5).map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs font-medium"
                          >
                            #{tag}
                          </span>
                        ))}
                        {tour.tags.length > 5 && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1">
                            +{tour.tags.length - 5}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <Link
                        to={`/tours/manage/${tour.id}`}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-1"
                      >
                        ⚙️ Upravljaj
                      </Link>
                      <Link
                        to={`/tours/edit/${tour.id}`}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium flex items-center gap-1"
                      >
                        ✏️ Uredi
                      </Link>
                      <button
                        onClick={() => handleDelete(tour.id)}
                        disabled={deleteLoading === tour.id}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-1"
                      >
                        {deleteLoading === tour.id ? "⏳..." : "🗑️ Obriši"}
                      </button>
                      <div className="flex-1 text-right text-xs text-gray-500 dark:text-gray-400 self-center">
                        {formatDate(tour.created_at)}
                      </div>
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
