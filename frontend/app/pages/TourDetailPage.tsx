import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router";
import Layout from "../components/Layout";
import MapComponent from "../components/MapComponent";
import { useAuth } from "../context/AuthContext";
import ReviewForm from "../components/ReviewForm";
import ReviewList from "../components/ReviewList";
import { useUserLocation } from "../hooks/useUserLocation";

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

interface KeyPoint {
  id: number;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  image_url: string;
  order: number;
}

export default function TourDetailPage() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [tour, setTour] = useState<Tour | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [keyPoints, setKeyPoints] = useState<KeyPoint[]>([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const userLocation = useUserLocation();
  const [startingTour, setStartingTour] = useState(false);
  const [hasActiveTour, setHasActiveTour] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartMessage, setCartMessage] = useState<string | null>(null);

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

  const fetchKeyPoints = async () => {
    try {
      const response = await fetch(`/api/tours-service/tours/${id}/keypoints`);
      if (response.ok) {
        const data = await response.json();
        setKeyPoints(data.keypoints || []);
      }
    } catch (err) {
      console.error("Error fetching key points:", err);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await fetch(`/api/tours-service/tours/${id}/reviews`);
      if (response.ok) {
        const data = await response.json();
        setReviews(data.reviews || []);
      }
    } catch (err) {
      console.error("Error fetching reviews:", err);
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

  const handleAddToCart = async () => {
    if (!token || !user || !tour) return;

    // Check if tour has a valid price
    if (!tour.price || tour.price <= 0) {
      setCartMessage("Ova tura nema definisanu cenu i ne može se dodati u korpu");
      setTimeout(() => setCartMessage(null), 5000);
      return;
    }

    try {
      setAddingToCart(true);
      setCartMessage(null);

      const response = await fetch("/api/purchases-service/cart/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          tour_id: tour.id,
          tour_name: tour.name,
          tour_price: tour.price,
          quantity: 1
        })
      });

      if (response.ok) {
        setCartMessage("Tura je dodana u korpu!");
        setTimeout(() => setCartMessage(null), 3000);
      } else {
        const error = await response.json();
        setCartMessage(`Greška: ${error.detail}`);
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
      setCartMessage("Greška pri dodavanju u korpu");
    } finally {
      setAddingToCart(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchTour();
      fetchKeyPoints();
      fetchReviews();
    }
  }, [id]);

  // Check if user has an active tour
  useEffect(() => {
    const checkActiveTour = async () => {
      if (!token || !user) return;
      
      try {
        const response = await fetch("/api/tours-service/tours/execution/active", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        
        // 404 or any error means no active tour
        if (response.status === 404 || !response.ok) {
          setHasActiveTour(false);
          return;
        }
        
        // Only set true if we successfully get data
        if (response.ok) {
          try {
            const data = await response.json();
            setHasActiveTour(!!data.execution);
          } catch (e) {
            setHasActiveTour(false);
          }
        } else {
          setHasActiveTour(false);
        }
      } catch (error) {
        console.error("Error checking active tour:", error);
        setHasActiveTour(false);
      }
    };

    checkActiveTour();
  }, [token, user]);

  const handleReviewSuccess = () => {
    setShowReviewForm(false);
    fetchReviews();
  };

  const handleStartTour = async () => {
    if (!token || !user || !tour) return;

    try {
      setStartingTour(true);

      // First, get current location from Position Simulator
      const locationResponse = await fetch(`/api/stakeholders-service/locations/current/${user.id}`, {
        credentials: "include",
      });

      if (!locationResponse.ok) {
        throw new Error("Molimo prvo postavite vašu lokaciju pomoću Position Simulatora");
      }

      const locationData = await locationResponse.json();
      
      if (!locationData.current_location) {
        throw new Error("Molimo prvo postavite vašu lokaciju pomoću Position Simulatora");
      }

      const { latitude, longitude } = locationData.current_location;

      // Start the tour
      const response = await fetch(`/api/tours-service/tours/${tour.id}/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ latitude, longitude })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Greška pri pokretanju ture");
      }

      // Redirect to active tour page
      navigate("/tours/active");
    } catch (error) {
      console.error("Error starting tour:", error);
      alert(error instanceof Error ? error.message : "Greška pri pokretanju ture");
    } finally {
      setStartingTour(false);
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
  const isAuthenticated = !!token;

  const handleMapClick = (lat: number, lng: number) => {
    // For TourDetailPage, map is read-only
    console.log("Map clicked at:", lat, lng);
  };

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

            {/* Map */}
            <div className="card">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Mapa Ture
              </h2>
              <div className="h-96 rounded-lg overflow-hidden border">
                <MapComponent
                  latitude={userLocation?.latitude}
                  longitude={userLocation?.longitude}
                  onMapClick={handleMapClick}
                  className="w-full h-full"
                  keyPoints={keyPoints.map(kp => ({
                    id: kp.id,
                    name: kp.name,
                    latitude: kp.latitude,
                    longitude: kp.longitude,
                    order: kp.order
                  }))}
                  showUserLocation={!!userLocation}
                />
              </div>
              {keyPoints.length > 0 && (
                <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                  <p className="font-medium mb-2">Ključne tačke:</p>
                  <ul className="space-y-1">
                    {keyPoints.map((kp) => (
                      <li key={kp.id}>• {kp.name} ({kp.latitude.toFixed(6)}, {kp.longitude.toFixed(6)})</li>
                    ))}
                  </ul>
                </div>
              )}
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

              {/* Cart Message */}
              {cartMessage && (
                <div className={`mb-4 p-3 rounded-lg text-center text-sm ${
                  cartMessage.includes("Greška") 
                    ? "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200"
                    : "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200"
                }`}>
                  {cartMessage}
                </div>
              )}
              
              {user?.role.toLowerCase() === "turista" && (tour.status === "published" || tour.status === "archived") && (
                <div className="space-y-3">
                  {/* Add to Cart Button - disabled if no price */}
                  {tour.price && tour.price > 0 ? (
                    <button
                      onClick={handleAddToCart}
                      disabled={addingToCart}
                      className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {addingToCart ? "Dodavanje..." : "🛒 Dodaj u korpu"}
                    </button>
                  ) : (
                    <div className="w-full bg-gray-300 text-gray-600 py-3 px-6 rounded-lg text-center font-medium cursor-not-allowed">
                      Cena nije definisana
                    </div>
                  )}

                  {/* View Cart Link */}
                  <Link
                    to="/purchase"
                    className="block w-full text-center bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 px-6 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
                  >
                    Pogledaj korpu →
                  </Link>

                  <hr className="border-gray-300 dark:border-gray-600" />

                  {/* Start Tour Section */}
                  {hasActiveTour ? (
                    <div className="space-y-3">
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-center">
                        <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                          Već imate aktivnu turu
                        </p>
                      </div>
                      <Link 
                        to="/tours/active"
                        className="block w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors font-medium text-center"
                      >
                        Pogledaj aktivnu turu
                      </Link>
                    </div>
                  ) : (
                    <button 
                      onClick={handleStartTour}
                      disabled={startingTour}
                      className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {startingTour ? "Pokretanje..." : "🚀 Pokreni turu"}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Tour Details Card */}
            <div className="card">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Detalji ture
              </h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">Težina</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(tour.difficulty)}`}>
                    {getDifficultyLabel(tour.difficulty)}
                  </span>
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

        {/* Reviews Section */}
        <div className="mt-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Recenzije ({reviews.length})
            </h2>
            {isAuthenticated && user?.role.toLowerCase() === "turista" && !isOwner && (
              <button
                onClick={() => setShowReviewForm(!showReviewForm)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {showReviewForm ? "Otkaži" : "Ostavite recenziju"}
              </button>
            )}
          </div>

          {showReviewForm && tour && (
            <div className="mb-8 bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
              <ReviewForm tourId={tour.id} onSuccess={handleReviewSuccess} />
            </div>
          )}

          <ReviewList reviews={reviews} />
        </div>
      </div>
    </Layout>
  );
}
