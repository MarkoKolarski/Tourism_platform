import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router";
import Layout from "../components/Layout";
import MapComponent from "../components/MapComponent";
import { useAuth } from "../context/AuthContext";
import { useUserLocation } from "../hooks/useUserLocation";
import React, { lazy, Suspense } from 'react';

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

interface TravelTime {
  id: number;
  transport_type: string;
  duration_min: number;
}

// Dinamički učitaj mapu samo na klijentu
const TourMap = lazy(() => import("../components/TourMap"));

export default function ManageTourPage() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  
  const [tour, setTour] = useState<Tour | null>(null);
  const [keyPoints, setKeyPoints] = useState<KeyPoint[]>([]);
  const [travelTimes, setTravelTimes] = useState<TravelTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"keypoints" | "travel" | "publish">("keypoints");
  
  // Key Point Form
  const [showKPForm, setShowKPForm] = useState(false);
  const [editingKeyPoint, setEditingKeyPoint] = useState<KeyPoint | null>(null);
  const [kpForm, setKpForm] = useState({
    id: null as number | null,
    name: "",
    description: "",
    latitude: "",
    longitude: "",
    image_url: "",
    order: ""
  });

  // Travel Time Form
  const [ttForm, setTtForm] = useState({
    transport_type: "walking",
    duration_min: ""
  });

  const userLocation = useUserLocation();

  useEffect(() => {
    fetchTourData();
  }, [id]);

  useEffect(() => {
    // Automatski postavi order na sledeći redni broj samo kod dodavanja
    if (showKPForm && !editingKeyPoint) {
      setKpForm(prev => ({
        ...prev,
        order: (keyPoints.length + 1).toString()
      }));
    }
  }, [showKPForm, keyPoints.length, editingKeyPoint]);

  const fetchTourData = async () => {
    try {
      setLoading(true);
      const [tourRes, kpRes, ttRes] = await Promise.all([
        fetch(`/api/tours-service/tours/${id}`),
        fetch(`/api/tours-service/tours/${id}/keypoints`),
        fetch(`/api/tours-service/tours/${id}/travel-times`)
      ]);

      const tourData = await tourRes.json();
      const kpData = await kpRes.json();
      const ttData = await ttRes.json();

      setTour(tourData.tour);
      setKeyPoints(kpData.keypoints || []);
      setTravelTimes(ttData.travel_times || []);

      // Ako postoje ključne tačke, centriraj mapu na prvu
      if (kpData.keypoints && kpData.keypoints.length > 0) {
        const firstKp = kpData.keypoints[0];
        setKpForm({
          ...kpForm,
          latitude: firstKp.latitude.toFixed(6),
          longitude: firstKp.longitude.toFixed(6)
        });
      }
    } catch (err) {
      setError("Failed to load tour data");
    } finally {
      setLoading(false);
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    setKpForm({
      ...kpForm,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6)
    });
  };

  const handleAddOrUpdateKeyPoint = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Proveri da li je lokacija odabrana
    if (!kpForm.latitude || !kpForm.longitude) {
      alert("Molimo odaberite lokaciju na mapi klikom na željeno mesto");
      return;
    }

    const isEditing = !!editingKeyPoint;
    const url = isEditing
      ? `/api/tours-service/tours/${id}/keypoints/${editingKeyPoint.id}`
      : `/api/tours-service/tours/${id}/keypoints`;
    const method = isEditing ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name: kpForm.name,
          description: kpForm.description,
          latitude: parseFloat(kpForm.latitude),
          longitude: parseFloat(kpForm.longitude),
          image_url: kpForm.image_url,
          order: parseInt(kpForm.order) || keyPoints.length + 1
        })
      });

      if (!response.ok) throw new Error(`Failed to ${isEditing ? 'update' : 'add'} key point`);

      // Resetuj formu i stanje
      setKpForm({ id: null, name: "", description: "", latitude: "", longitude: "", image_url: "", order: "" });
      setShowKPForm(false);
      setEditingKeyPoint(null);
      fetchTourData();
    } catch (err) {
      alert(`Failed to ${isEditing ? 'update' : 'add'} key point`);
    }
  };

  const handleAddTravelTime = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/tours-service/tours/${id}/travel-times`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          transport_type: ttForm.transport_type,
          duration_min: parseInt(ttForm.duration_min)
        })
      });

      if (!response.ok) throw new Error("Failed to add travel time");

      setTtForm({ transport_type: "walking", duration_min: "" });
      fetchTourData();
    } catch (err) {
      alert("Failed to add travel time");
    }
  };

  const handleDeleteTravelTime = async (ttId: number) => {
    if (!confirm("Da li ste sigurni da želite da obrišete ovo vreme putovanja?")) return;

    try {
      const response = await fetch(`/api/tours-service/tours/${id}/travel-times/${ttId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (!response.ok) throw new Error("Failed to delete travel time");

      fetchTourData();
    } catch (err) {
      alert("Failed to delete travel time");
    }
  };

  const handlePublish = async () => {
    if (!confirm("Da li ste sigurni da želite da objavite ovu turu?")) return;

    try {
      const response = await fetch(`/api/tours-service/tours/${id}/publish`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to publish");
      }

      fetchTourData();
      alert("Tura je uspešno objavljena!");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to publish tour");
    }
  };

  const handleArchive = async () => {
    if (!confirm("Da li ste sigurni da želite da arhivirate ovu turu?")) return;

    try {
      const response = await fetch(`/api/tours-service/tours/${id}/archive`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (!response.ok) throw new Error("Failed to archive");

      fetchTourData();
      alert("Tura je arhivirana!");
    } catch (err) {
      alert("Failed to archive tour");
    }
  };

  const handleEditKeyPoint = (kp: KeyPoint) => {
    setEditingKeyPoint(kp);
    setKpForm({
      id: kp.id,
      name: kp.name,
      description: kp.description,
      latitude: kp.latitude.toFixed(6),
      longitude: kp.longitude.toFixed(6),
      image_url: kp.image_url,
      order: kp.order.toString()
    });
    setShowKPForm(true);
  };

  const cancelEdit = () => {
    setEditingKeyPoint(null);
    setShowKPForm(false);
    setKpForm({ id: null, name: "", description: "", latitude: "", longitude: "", image_url: "", order: "" });
  };

  const handleDeleteKeyPoint = async (kpId: number) => {
    if (!confirm("Obrisati ovu ključnu tačku?")) return;

    try {
      const response = await fetch(`/api/tours-service/tours/${id}/keypoints/${kpId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (!response.ok) throw new Error("Failed to delete");

      fetchTourData();
    } catch (err) {
      alert("Failed to delete key point");
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/4 mb-6"></div>
            <div className="h-64 bg-gray-300 rounded"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!tour) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto px-4 py-8">
          <p className="text-red-500">Tura nije pronađena</p>
        </div>
      </Layout>
    );
  }

  const canPublish = keyPoints.length >= 2 && travelTimes.length > 0;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">{tour.name}</h1>
            <div className="flex gap-2 items-center">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                tour.status === 'published' ? 'bg-green-100 text-green-800' :
                tour.status === 'archived' ? 'bg-gray-100 text-gray-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {tour.status.toUpperCase()}
              </span>
              <span className="text-gray-500">{tour.total_length_km.toFixed(1)} km</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to={`/tours/edit/${id}`} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
              Uredi
            </Link>
            <Link to="/my-tours" className="px-4 py-2 border rounded-lg">
              Nazad
            </Link>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-800">{error}</div>}

        {/* Tabs */}
        <div className="flex gap-4 border-b mb-6">
          <button
            onClick={() => setActiveTab("keypoints")}
            className={`pb-2 px-4 ${activeTab === "keypoints" ? "border-b-2 border-blue-600 font-medium" : ""}`}
          >
            Ključne tačke ({keyPoints.length})
          </button>
          <button
            onClick={() => setActiveTab("travel")}
            className={`pb-2 px-4 ${activeTab === "travel" ? "border-b-2 border-blue-600 font-medium" : ""}`}
          >
            Vremena putovanja ({travelTimes.length})
          </button>
          <button
            onClick={() => setActiveTab("publish")}
            className={`pb-2 px-4 ${activeTab === "publish" ? "border-b-2 border-blue-600 font-medium" : ""}`}
          >
            Objavi
          </button>
        </div>

        {/* Key Points Tab */}
        {activeTab === "keypoints" && (
          <div className="grid md:grid-cols-2 gap-8">
            {/* Left Column: List and Form */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Ključne tačke</h2>
                {!showKPForm && (
                  <button
                    onClick={() => {
                      setShowKPForm(true);
                      setEditingKeyPoint(null);
                      setKpForm({ id: null, name: "", description: "", latitude: "", longitude: "", image_url: "", order: "" });
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg"
                  >
                    + Dodaj ključnu tačku
                  </button>
                )}
              </div>

              {showKPForm && (
                <form onSubmit={handleAddOrUpdateKeyPoint} className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg mb-6">
                  <h3 className="text-lg font-semibold mb-4">{editingKeyPoint ? "Izmena ključne tačke" : "Dodavanje nove ključne tačke"}</h3>
                  <div className="grid sm:grid-cols-2 gap-4 mb-4">
                    <input
                      type="text"
                      placeholder="Naziv *"
                      required
                      value={kpForm.name}
                      onChange={(e) => setKpForm({ ...kpForm, name: e.target.value })}
                      className="px-4 py-2 border rounded-lg dark:bg-gray-700"
                    />
                    <input
                      type="number"
                      placeholder="Redni broj"
                      value={kpForm.order}
                      onChange={(e) => !editingKeyPoint && setKpForm({ ...kpForm, order: e.target.value })}
                      readOnly={!!editingKeyPoint}
                      className={`px-4 py-2 border rounded-lg dark:bg-gray-700 ${editingKeyPoint ? 'bg-gray-100 dark:bg-gray-600 cursor-not-allowed' : ''}`}
                    />
                    <input
                      type="text"
                      placeholder="Geografska širina *"
                      required
                      readOnly
                      value={kpForm.latitude}
                      className="px-4 py-2 border rounded-lg dark:bg-gray-700 bg-gray-100 dark:bg-gray-600 cursor-not-allowed"
                    />
                    <input
                      type="text"
                      placeholder="Geografska dužina *"
                      required
                      readOnly
                      value={kpForm.longitude}
                      className="px-4 py-2 border rounded-lg dark:bg-gray-700 bg-gray-100 dark:bg-gray-600 cursor-not-allowed"
                    />
                    <input
                      type="text"
                      placeholder="URL slike"
                      value={kpForm.image_url}
                      onChange={(e) => setKpForm({ ...kpForm, image_url: e.target.value })}
                      className="sm:col-span-2 px-4 py-2 border rounded-lg dark:bg-gray-700"
                    />
                  </div>
                  <textarea
                    placeholder="Opis *"
                    required
                    rows={3}
                    value={kpForm.description}
                    onChange={(e) => setKpForm({ ...kpForm, description: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg mb-4 dark:bg-gray-700"
                  />
                  
                  <p className="mb-2 font-medium text-sm">Odaberite lokaciju klikom na mapu.</p>

                  <div className="flex gap-2">
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">
                      {editingKeyPoint ? "Sačuvaj izmene" : "Sačuvaj"}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="px-4 py-2 border rounded-lg"
                    >
                      Otkaži
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-4">
                {keyPoints.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Nema ključnih tačaka. Dodajte najmanje 2 da biste objavili turu.</p>
                ) : (
                  keyPoints.sort((a, b) => a.order - b.order).map((kp) => (
                    <div key={kp.id} className={`border rounded-lg p-4 ${editingKeyPoint?.id === kp.id ? 'bg-blue-50 border-blue-300 dark:bg-gray-800 dark:border-blue-700' : 'dark:bg-gray-800'}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-lg">{kp.order}. {kp.name}</h3>
                          <p className="text-gray-600 dark:text-gray-400 mb-2 text-sm">{kp.description}</p>
                          <p className="text-sm text-gray-500">
                            📍 {kp.latitude.toFixed(6)}, {kp.longitude.toFixed(6)}
                          </p>
                          {kp.image_url && (
                            <img 
                              src={kp.image_url} 
                              alt={kp.name} 
                              className="mt-2 max-w-xs rounded-lg"
                            />
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0 ml-2">
                          <button
                            onClick={() => handleEditKeyPoint(kp)}
                            className="text-sm px-3 py-1 border rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            Uredi
                          </button>
                          <button
                            onClick={() => handleDeleteKeyPoint(kp.id)}
                            className="text-red-600 hover:text-red-800 text-xl"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right Column: Map */}
            <div className="h-[calc(100vh-10rem)] sticky top-24">
              <p className="mb-2 font-medium">Mapa ključnih tačaka</p>
              <div className="h-full rounded-lg overflow-hidden border">
                <MapComponent
                  latitude={kpForm.latitude ? parseFloat(kpForm.latitude) : undefined}
                  longitude={kpForm.longitude ? parseFloat(kpForm.longitude) : undefined}
                  onMapClick={handleMapClick}
                  className="w-full h-full"
                  keyPoints={keyPoints}
                  editingKeyPointId={editingKeyPoint?.id || null}
                  showUserLocation={false}
                />
              </div>
              {kpForm.latitude && kpForm.longitude && (
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  <p>📍 Odabrana lokacija: {parseFloat(kpForm.latitude).toFixed(6)}, {parseFloat(kpForm.longitude).toFixed(6)}</p>
                </div>
              )}
              {keyPoints.length > 0 && (
                <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 max-h-32 overflow-y-auto">
                  <p className="font-medium mb-2">Ključne tačke:</p>
                  <ul className="space-y-1">
                    {keyPoints.sort((a, b) => a.order - b.order).map((kp) => (
                      <li key={kp.id} className={editingKeyPoint?.id === kp.id ? "text-blue-600 font-medium" : ""}>
                        • {kp.order}. {kp.name} ({kp.latitude.toFixed(6)}, {kp.longitude.toFixed(6)})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Travel Times Tab */}
        {activeTab === "travel" && (
          <div>
            <h2 className="text-xl font-bold mb-4">Vremena putovanja</h2>

            <form onSubmit={handleAddTravelTime} className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg mb-6">
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <select
                  value={ttForm.transport_type}
                  onChange={(e) => setTtForm({ ...ttForm, transport_type: e.target.value })}
                  className="px-4 py-2 border rounded-lg dark:bg-gray-700"
                >
                  <option value="walking">🚶 Peške</option>
                  <option value="bicycle">🚴 Bicikl</option>
                  <option value="car">🚗 Automobil</option>
                </select>
                <input
                  type="number"
                  placeholder="Trajanje (minuta) *"
                  required
                  min="1"
                  value={ttForm.duration_min}
                  onChange={(e) => setTtForm({ ...ttForm, duration_min: e.target.value })}
                  className="px-4 py-2 border rounded-lg dark:bg-gray-700"
                />
              </div>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">
                Dodaj
              </button>
            </form>

            <div className="space-y-3">
              {travelTimes.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Nema definisanih vremena. Dodajte bar jedno da biste objavili turu.</p>
              ) : (
                travelTimes.map((tt) => (
                  <div key={tt.id} className="border rounded-lg p-4 flex justify-between items-center">
                    <div>
                      <span className="font-medium">
                        {tt.transport_type === 'walking' ? '🚶 Peške' :
                         tt.transport_type === 'bicycle' ? '🚴 Bicikl' : '🚗 Automobil'}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400 ml-4">
                        {tt.duration_min} minuta
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteTravelTime(tt.id)}
                      className="text-red-600 hover:text-red-800 text-xl"
                    >
                      🗑️
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Publish Tab */}
        {activeTab === "publish" && (
          <div>
            <h2 className="text-xl font-bold mb-4">Objavljivanje ture</h2>

            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-3">
                <span className={keyPoints.length >= 2 ? "text-green-600" : "text-red-600"}>
                  {keyPoints.length >= 2 ? "✓" : "✗"}
                </span>
                <span>Najmanje 2 ključne tačke ({keyPoints.length})</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={travelTimes.length > 0 ? "text-green-600" : "text-red-600"}>
                  {travelTimes.length > 0 ? "✓" : "✗"}
                </span>
                <span>Najmanje 1 vreme putovanja ({travelTimes.length})</span>
              </div>
            </div>

            {tour.status === "draft" && (
              <button
                onClick={handlePublish}
                disabled={!canPublish}
                className="px-6 py-3 bg-green-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {canPublish ? "Objavi turu" : "Ispunite sve uslove za objavu"}
              </button>
            )}

            {tour.status === "published" && (
              <button
                onClick={handleArchive}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg"
              >
                Arhiviraj turu
              </button>
            )}

            {tour.status === "archived" && (
              <button
                onClick={handlePublish}
                className="px-6 py-3 bg-green-600 text-white rounded-lg"
              >
                Ponovo aktiviraj turu
              </button>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
