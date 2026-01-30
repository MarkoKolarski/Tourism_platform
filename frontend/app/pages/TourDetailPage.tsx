import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router";
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

export default function TourDetailPage() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [tour, setTour] = useState<Tour | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchTour = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tours-service/tours/${id}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Tour not found");
        }
        throw new Error("Failed to fetch tour");
      }

      const data = await response.json();
      setTour(data.tour);
    } catch (err) {
      console.error("Error fetching tour:", err);
      setError(err instanceof Error ? err.message : "Failed to load tour");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!tour || !confirm("Da li ste sigurni da želite da obrišete ovu turu?")) {
      return;
    }

    try {
      setDeleteLoading(true);
      const response = await fetch(`/api/tours-service/tours/${tour.id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to delete tour");
      }

      navigate("/my-tours");
    } catch (err) {
      console.error("Error deleting tour:", err);
      setError("Failed to delete tour");
    } finally {
      setDeleteLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchTour();
    }
  }, [id]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("sr-RS", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
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
      default: return "Nepoznato";
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-300 rounded w-1/2 mb-6"></div>
            <div className="h-48 bg-gray-300 rounded mb-6"></div>
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-300 rounded w-full"></div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !tour) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Tura nije pronađena
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {error || "Tura koju tražite ne postoji ili je uklonjena."}
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => navigate(-1)}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                ← Nazad
              </button>
              <Link
                to="/tours"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Sve ture
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const isOwner = user && tour.author_id === user.id;
  const canEdit = user?.role.toLowerCase() === "vodic" && isOwner;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with actions */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              {tour.name}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Kreirana {formatDate(tour.created_at)}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              ← Nazad
            </button>

            {canEdit && (
              <>
                <Link
                  to={`/tours/manage/${tour.id}`}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  ⚙️ Upravljaj
                </Link>
                <Link
                  to={`/tours/edit/${tour.id}`}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                >
                  ✏️ Uredi
                </Link>
                <button
                  onClick={handleDelete}
                  disabled={deleteLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {deleteLoading ? "..." : "🗑️ Obriši"}
                </button>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Tour Details */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            <div className="card">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Opis ture
              </h2>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                {tour.description}
              </p>
            </div>

            {/* Additional Information */}
            <div className="card">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Dodatne informacije
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Što uključuje
                  </h3>
                  <ul className="text-gray-700 dark:text-gray-300 space-y-1">
                    <li>• Profesionalni vodič</li>
                    <li>• Organizovani prevoz</li>
                    <li>• Sve ulaznice</li>
                    <li>• Osiguranje putovanja</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Što ponijeti
                  </h3>
                  <ul className="text-gray-700 dark:text-gray-300 space-y-1">
                    <li>• Udobnu obuću</li>
                    <li>• Zaštitu od sunca</li>
                    <li>• Vodu i grickalice</li>
                    <li>• Fotoaparat</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Price Card */}
            <div className="card bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800">
              <div className="text-center mb-6">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                  {formatPrice(tour.price)}
                </div>
                <p className="text-gray-600 dark:text-gray-400">po osobi</p>
              </div>
              
              <button className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                Rezervišite sada
              </button>
            </div>

            {/* Tour Details Card */}
            <div className="card">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Detalji ture
              </h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">Težina</span>
                  <span className="font-medium">{getDifficultyLabel(tour.difficulty)}</span>
                </div>
                
                <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">Dužina</span>
                  <span className="font-medium">{tour.total_length_km.toFixed(1)} km</span>
                </div>
                
                <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">Status</span>
                  <span className="font-medium capitalize">{tour.status}</span>
                </div>
                
                <div className="flex justify-between items-center py-3">
                  <span className="text-gray-600 dark:text-gray-400">Poslednje ažuriranje</span>
                  <span className="font-medium text-sm">{formatDate(tour.updated_at)}</span>
                </div>
              </div>
            </div>

            {/* Contact Card */}
            <div className="card">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Kontakt
              </h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">📞</span>
                  <div>
                    <p className="font-medium">+381 11 123 4567</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Pozovite nas</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="text-2xl mr-3">✉️</span>
                  <div>
                    <p className="font-medium">info@tourism.rs</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Pošaljite email</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="text-2xl mr-3">💬</span>
                  <div>
                    <p className="font-medium">WhatsApp</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Brza poruka</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
