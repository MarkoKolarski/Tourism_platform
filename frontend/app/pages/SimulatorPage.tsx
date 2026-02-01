import { useState, useEffect, type MouseEvent } from "react";
import { useNavigate } from "react-router";
import Layout from "../components/Layout";
import MapComponent from "../components/MapComponent";
import { useAuth } from "../context/AuthContext";

interface Location {
  id: number;
  user_id: number;
  latitude: number;
  longitude: number;
  recorded_at: string;
}

interface SimulatorData {
  user_id: number;
  username: string;
  current_location: Location | null;
  has_location: boolean;
}

export default function SimulatorPage() {
  const { user, isLoading, isAuthenticated, token } = useAuth();
  const navigate = useNavigate();
  const [simulatorData, setSimulatorData] = useState<SimulatorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  // Redirect ako nije ulogovan
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [user, navigate, isLoading, isAuthenticated]);

  // Učitaj trenutnu lokaciju korisnika
  useEffect(() => {
    if (isLoading || !user) return;

    const fetchCurrentLocation = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/tours-service/locations/current`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error("Greška pri učitavanju lokacije");
        }

        const data = await response.json();
        setSimulatorData(data);
      } catch (error) {
        console.error("Greška:", error);
        setError("Greška pri učitavanju lokacije");
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentLocation();
  }, [user, isLoading]);

  const handleMapClick = async (lat: number, lng: number) => {
    if (!user || updating) return;

    try {
      setUpdating(true);
      const response = await fetch(`/api/tours-service/locations/current`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          latitude: parseFloat(lat.toFixed(6)),
          longitude: parseFloat(lng.toFixed(6)),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Greška pri ažuriranju lokacije");
      }

      const newLocation = await response.json();
      
      // Ažuriraj lokalne podatke
      setSimulatorData((prev: SimulatorData | null) => prev ? {
        ...prev,
        current_location: newLocation,
        has_location: true
      } : null);

      alert(`Lokacija postavljena: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);

    } catch (error) {
      console.error("Greška pri postavljanju lokacije:", error);
      alert(error instanceof Error ? error.message : "Greška pri postavljanju lokacije");
    } finally {
      setUpdating(false);
    }
  };

  const handleClearLocation = async () => {
    if (!user || updating) return;

    if (!confirm("Da li ste sigurni da želite da obrišete trenutnu lokaciju?")) {
      return;
    }

    try {
      setUpdating(true);
      const response = await fetch(`/api/tours-service/locations/current`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error("Greška pri brisanju lokacije");
      }

      setSimulatorData((prev: SimulatorData | null) => prev ? {
        ...prev,
        current_location: null,
        has_location: false
      } : null);

      alert("Lokacija je uspešno obrisana");

    } catch (error) {
      console.error("Greška pri brisanju lokacije:", error);
      alert("Greška pri brisanju lokacije");
    } finally {
      setUpdating(false);
    }
  };

  if (isLoading || !user) {
    return (
        <Layout>
            <div className="text-center py-12">
                <div className="spinner mx-auto"></div>
            </div>
        </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              📍 Simulator Pozicije
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Kliknite na mapu da postavite svoju trenutnu lokaciju
            </p>
          </div>

          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">Učitavam podatke...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {!loading && !error && simulatorData && (
            <div className="space-y-6">
              {/* Informacije o korisniku */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  👤 Korisnik: {simulatorData.username}
                </h2>
                
                {simulatorData.has_location && simulatorData.current_location ? (
                  <div className="space-y-2">
                    <p className="text-green-600 dark:text-green-400 font-medium">
                      ✅ Trenutna lokacija postavljena
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Latitude:</span> {simulatorData.current_location.latitude.toFixed(6)}
                      </div>
                      <div>
                        <span className="font-medium">Longitude:</span> {simulatorData.current_location.longitude.toFixed(6)}
                      </div>
                      <div className="col-span-2">
                        <span className="font-medium">Poslednja izmena:</span> {new Date(simulatorData.current_location.recorded_at).toLocaleString("sr-RS")}
                      </div>
                    </div>
                    <button
                      onClick={handleClearLocation}
                      disabled={updating}
                      className="mt-4 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      {updating ? "Brišem..." : "🗑️ Obriši lokaciju"}
                    </button>
                  </div>
                ) : (
                  <p className="text-yellow-600 dark:text-yellow-400 font-medium">
                    ⚠️ Lokacija nije postavljena. Kliknite na mapu da je postavite.
                  </p>
                )}
              </div>

              {/* Mapa */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Interaktivna mapa
                </h2>
                
                <div className="mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {updating ? "Postavljam lokaciju..." : "🎯 Kliknite bilo gde na mapi da postavite svoju poziciju"}
                  </p>
                </div>

                <div className="relative" style={{ zIndex: 1 }}>
                  <MapComponent
                    latitude={simulatorData.current_location?.latitude}
                    longitude={simulatorData.current_location?.longitude}
                    onMapClick={handleMapClick}
                    className="w-full h-96"
                    showUserLocation={true}
                  />
                </div>

                <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                  <p><strong>Legenda:</strong></p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>🔴 Crvena tačka = Vaša trenutna pozicija</li>
                    <li>🎯 Klik na mapu = Postavlja novu poziciju</li>
                    <li>📍 Koordinate se automatski računaju na osnovu pozicije klika</li>
                    <li>🗺️ Prava mapa Novog Sada sa OpenStreetMap podacima</li>
                  </ul>
                </div>
              </div>

              {/* Dodatne informacije */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-2">
                  ℹ️ Napomene o simulatoru:
                </h3>
                <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                  <li>• Simulator pozicije zamenjuje GPS funkcionalnost mobilne aplikacije</li>
                  <li>• Koordinate se čuvaju u bazi podataka za buduće korišćenje</li>
                  <li>• Samo jedan korisnik može imati aktivnu lokaciju u isto vreme</li>
                  <li>• Lokacija se koristi za funkcionalnosti vezane za geografsku poziciju</li>
                  <li>• <strong>Tokom aktivne ture:</strong> Lokacija se automatski prati svakih 10 sekundi</li>
                  <li>• <strong>Ključne tačke:</strong> Kada ste blizu (~50m), automatski se označavaju kao posećene</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
