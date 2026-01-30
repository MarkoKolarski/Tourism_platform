import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router";
import Layout from "../components/Layout";
import MapComponent from "../components/MapComponent";
import { useAuth } from "../context/AuthContext";

interface TourExecution {
  id: number;
  tour_id: number;
  tourist_id: number;
  status: string;
  start_latitude: number;
  start_longitude: number;
  last_activity: string;
  created_at: string;
  updated_at: string;
}

interface CompletedKeyPoint {
  id: number;
  execution_id: number;
  key_point_id: number;
  completed_at: string;
}

interface KeyPoint {
  id: number;
  tour_id: number;
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
  total_length_km: number;
}

export default function ActiveTourPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [execution, setExecution] = useState<TourExecution | null>(null);
  const [tour, setTour] = useState<Tour | null>(null);
  const [keyPoints, setKeyPoints] = useState<KeyPoint[]>([]);
  const [completedKeyPoints, setCompletedKeyPoints] = useState<CompletedKeyPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [nearbyKeyPoint, setNearbyKeyPoint] = useState<KeyPoint | null>(null);
  const [completing, setCompleting] = useState(false);
  const [abandoning, setAbandoning] = useState(false);
  const [updatingLocation, setUpdatingLocation] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch active tour execution
  const fetchActiveExecution = async () => {
    if (!token) return;

    try {
      const response = await fetch("/api/tours-service/tours/execution/active", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          navigate("/tourist-tours");
          return;
        }
        throw new Error("Failed to fetch active tour");
      }

      const data = await response.json();
      setExecution(data.execution);
      setCompletedKeyPoints(data.completed_keypoints || []);

      // Fetch tour details
      if (data.execution?.tour_id) {
        fetchTourDetails(data.execution.tour_id);
      }
    } catch (err) {
      console.error("Error:", err);
      setError(err instanceof Error ? err.message : "Failed to load active tour");
    } finally {
      setLoading(false);
    }
  };

  // Fetch tour details
  const fetchTourDetails = async (tourId: number) => {
    try {
      const [tourRes, keyPointsRes] = await Promise.all([
        fetch(`/api/tours-service/tours/${tourId}`),
        fetch(`/api/tours-service/tours/${tourId}/keypoints`)
      ]);

      if (tourRes.ok) {
        const tourData = await tourRes.json();
        setTour(tourData.tour);
      }

      if (keyPointsRes.ok) {
        const kpData = await keyPointsRes.json();
        setKeyPoints(kpData.keypoints || []);
      }
    } catch (err) {
      console.error("Error fetching tour details:", err);
    }
  };

  // Poll location and update tour
  const pollLocationAndUpdate = async () => {
    if (!user || !token || !execution) return;

    try {
      // 1. Get current location from Position Simulator
      const locationResponse = await fetch(`/api/stakeholders-service/locations/current/${user.id}`, {
        credentials: "include",
      });

      if (!locationResponse.ok) {
        console.warn("Could not get current location");
        return;
      }

      const locationData = await locationResponse.json();
      
      if (!locationData.current_location) {
        console.warn("No current location available");
        return;
      }

      const { latitude, longitude } = locationData.current_location;
      setCurrentLocation({ latitude, longitude });

      // 2. Update tour location and check for nearby keypoints
      const updateResponse = await fetch(`/api/tours-service/tours/execution/${execution.id}/location`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ latitude, longitude })
      });

      if (updateResponse.ok) {
        const updateData = await updateResponse.json();
        
        if (updateData.completed && updateData.nearby_keypoint) {
          setNearbyKeyPoint(updateData.nearby_keypoint);
          
          // Refresh execution to get updated completed keypoints
          fetchActiveExecution();
          
          // Clear notification after 5 seconds
          setTimeout(() => setNearbyKeyPoint(null), 5000);
        }
      }
    } catch (error) {
      console.error("Error polling location:", error);
    }
  };

  // Start polling on mount
  useEffect(() => {
    fetchActiveExecution();

    // Start polling every 10 seconds
    pollingIntervalRef.current = setInterval(() => {
      pollLocationAndUpdate();
    }, 10000);

    // Cleanup on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [token, user]);

  // Poll immediately when execution is loaded
  useEffect(() => {
    if (execution) {
      pollLocationAndUpdate();
    }
  }, [execution?.id]);

  // Complete tour
  const handleCompleteTour = async () => {
    if (!execution || !token || completing) return;

    if (!confirm("Da li ste sigurni da želite da završite turu?")) {
      return;
    }

    try {
      setCompleting(true);
      const response = await fetch(`/api/tours-service/tours/execution/${execution.id}/complete`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to complete tour");
      }

      alert("Tura je uspešno završena!");
      navigate("/tourist-tours");
    } catch (error) {
      console.error("Error completing tour:", error);
      alert("Greška pri završavanju ture");
    } finally {
      setCompleting(false);
    }
  };

  // Abandon tour
  const handleAbandonTour = async () => {
    if (!execution || !token || abandoning) return;

    if (!confirm("Da li ste sigurni da želite da napustite turu?")) {
      return;
    }

    try {
      setAbandoning(true);
      const response = await fetch(`/api/tours-service/tours/execution/${execution.id}/abandon`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to abandon tour");
      }

      alert("Napustili ste turu");
      navigate("/tourist-tours");
    } catch (error) {
      console.error("Error abandoning tour:", error);
      alert("Greška pri napuštanju ture");
    } finally {
      setAbandoning(false);
    }
  };

  // Handle manual location update from map click
  const handleMapClick = async (lat: number, lng: number) => {
    if (!user || updatingLocation) return;

    try {
      setUpdatingLocation(true);
      const response = await fetch(`/api/stakeholders-service/locations/current/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          latitude: parseFloat(lat.toFixed(6)),
          longitude: parseFloat(lng.toFixed(6)),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Greška pri ažuriranju lokacije");
      }

      // Immediately poll location and update tour
      await pollLocationAndUpdate();
      
    } catch (error) {
      console.error("Greška pri postavljanju lokacije:", error);
      alert(error instanceof Error ? error.message : "Greška pri postavljanju lokacije");
    } finally {
      setUpdatingLocation(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("sr-RS", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const isKeyPointCompleted = (keyPointId: number) => {
    return completedKeyPoints.some(ckp => ckp.key_point_id === keyPointId);
  };

  const getCompletionPercentage = () => {
    if (keyPoints.length === 0) return 0;
    return Math.round((completedKeyPoints.length / keyPoints.length) * 100);
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/3 mb-6"></div>
            <div className="h-96 bg-gray-300 rounded mb-6"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !execution || !tour) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-3xl font-bold mb-4">Nema aktivne ture</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {error || "Trenutno nemate aktivnu turu."}
            </p>
            <Link
              to="/tourist-tours"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-block"
            >
              Pregledaj ture
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">🚶 Aktivna tura: {tour.name}</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Započeta: {formatDate(execution.created_at)}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCompleteTour}
                disabled={completing}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {completing ? "..." : "✓ Završi turu"}
              </button>
              <button
                onClick={handleAbandonTour}
                disabled={abandoning}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {abandoning ? "..." : "✕ Napusti turu"}
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-4 mb-2">
            <div
              className="bg-blue-600 h-4 rounded-full transition-all duration-300"
              style={{ width: `${getCompletionPercentage()}%` }}
            ></div>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {completedKeyPoints.length} od {keyPoints.length} ključnih tačaka ({getCompletionPercentage()}%)
          </div>
        </div>

        {/* Notification for nearby keypoint */}
        {nearbyKeyPoint && (
          <div className="mb-6 bg-green-50 dark:bg-green-900/20 border-2 border-green-500 rounded-lg p-4 animate-pulse">
            <div className="flex items-center gap-3">
              <span className="text-3xl">✓</span>
              <div>
                <h3 className="font-bold text-green-800 dark:text-green-200">
                  Ključna tačka dostiže!
                </h3>
                <p className="text-green-700 dark:text-green-300">
                  {nearbyKeyPoint.name}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Map */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
              <h2 className="text-xl font-bold mb-4">🗺️ Interaktivna mapa</h2>
              <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  {updatingLocation ? "⏳ Postavljam lokaciju..." : "🎯 Kliknite na mapu da simulirate svoju poziciju"}
                </p>
              </div>
              <div className="h-96 rounded-lg overflow-hidden border">
                <MapComponent
                  latitude={currentLocation?.latitude}
                  longitude={currentLocation?.longitude}
                  onMapClick={handleMapClick}
                  className="w-full h-full"
                  keyPoints={keyPoints.map(kp => ({
                    id: kp.id,
                    name: kp.name,
                    latitude: kp.latitude,
                    longitude: kp.longitude,
                    order: kp.order
                  }))}
                  showUserLocation={true}
                />
              </div>
              <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                <p className="font-medium mb-2">📍 Informacije o lokaciji:</p>
                <ul className="space-y-1 ml-4">
                  <li>• Lokacija se automatski proverava svakih 10 sekundi</li>
                  {currentLocation && (
                    <li>• Trenutna: {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}</li>
                  )}
                  <li>• Kliknite bilo gde na mapi da postavite novu poziciju</li>
                  <li>• 🔴 Crvena tačka = Vaša trenutna pozicija</li>
                  <li>• 🔵 Plave tačke = Neposećene ključne tačke</li>
                  <li>• 🟢 Zelene tačke = Posećene ključne tačke</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Sidebar - Key Points List */}
          <div className="space-y-6">
            {/* Tour Info */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
              <h2 className="text-xl font-bold mb-4">Informacije o turi</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Težina:</span>
                  <span className="font-medium">{"★".repeat(tour.difficulty)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Dužina:</span>
                  <span className="font-medium">{tour.total_length_km.toFixed(1)} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Poslednja aktivnost:</span>
                  <span className="font-medium text-sm">{formatDate(execution.last_activity)}</span>
                </div>
              </div>
            </div>

            {/* Key Points Checklist */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
              <h2 className="text-xl font-bold mb-4">Ključne tačke</h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {keyPoints.map((kp, index) => {
                  const completed = isKeyPointCompleted(kp.id);
                  return (
                    <div
                      key={kp.id}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        completed
                          ? "bg-green-50 dark:bg-green-900/20 border-green-500"
                          : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                          completed ? "bg-green-500 text-white" : "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300"
                        }`}>
                          {completed ? "✓" : index + 1}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium">{kp.name}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                            {kp.description}
                          </p>
                          {completed && (
                            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                              ✓ Kompletirana
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="font-bold text-blue-800 dark:text-blue-200 mb-2">
            📋 Uputstva za korišćenje
          </h3>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li>• <strong>Simulator pozicije:</strong> Kliknite bilo gde na mapi da postavite svoju lokaciju</li>
            <li>• <strong>Automatska provera:</strong> Vaša lokacija se proverava svakih 10 sekundi</li>
            <li>• <strong>Kompletiranje tačaka:</strong> Kada budete unutar ~50m od ključne tačke, automatski će biti označena</li>
            <li>• <strong>Praćenje napretka:</strong> Pratite svoj napredak u bočnoj traci i na mapi</li>
            <li>• <strong>Završetak:</strong> Kliknite "Završi turu" kada kompletiraš sve tačke</li>
            <li>• <strong>Napuštanje:</strong> Možete napustiti turu u bilo kom trenutku</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}
