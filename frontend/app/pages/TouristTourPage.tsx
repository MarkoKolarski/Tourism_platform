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
  author_name?: string;
  first_keypoint?: {
    id: number;
    name: string;
    description: string;
    latitude: number;
    longitude: number;
    image_url: string;
    order: number;
  };
}

export default function TouristTourPage() {
  const { user } = useAuth();
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<number | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);

  useEffect(() => {
    fetchTours();
  }, []);

  const fetchTours = async () => {
    try {
      setLoading(true);      
      const response = await fetch("/api/v1/tours/for-tourists");
      
      if (!response.ok) {
        throw new Error("Failed to fetch tours");
      }
      
      const data = await response.json();
      setTours(data.tours || []);
    } catch (err) {
      setError("Failed to load tours");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredTours = tours.filter(tour => {
    const matchesSearch = searchTerm === "" || 
      tour.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tour.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tour.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Filtriranje po težini
    const matchesDifficulty = selectedDifficulty === null || tour.difficulty === selectedDifficulty;
    
    // Filtriranje po ceni
    const matchesPrice = maxPrice === null || tour.price <= maxPrice;
    
    return matchesSearch && matchesDifficulty && matchesPrice;
  });

  // Funkcija za formatiranje cene
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('sr-RS', {
      style: 'currency',
      currency: 'RSD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  // Funkcija za prikaz zvezdica za težinu
  const renderDifficulty = (difficulty: number) => {
    return "★".repeat(difficulty) + "☆".repeat(5 - difficulty);
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-64 bg-gray-300 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dostupne ture</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Pregledajte sve objavljene ture. Kliknite na turu da vidite više detalja.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-800">
            {error}
          </div>
        )}

        {/* Filteri i pretraga */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Pretraga */}
            <div>
              <label className="block text-sm font-medium mb-2">Pretraga</label>
              <input
                type="text"
                placeholder="Pretraži po nazivu, opisu ili tagovima..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700"
              />
            </div>

            {/* Težina */}
            <div>
              <label className="block text-sm font-medium mb-2">Težina</label>
              <select
                value={selectedDifficulty || ""}
                onChange={(e) => setSelectedDifficulty(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700"
              >
                <option value="">Sve težine</option>
                <option value="1">★☆☆☆☆ Lako</option>
                <option value="2">★★☆☆☆ Umereno</option>
                <option value="3">★★★☆☆ Srednje</option>
                <option value="4">★★★★☆ Teško</option>
                <option value="5">★★★★★ Vrlo teško</option>
              </select>
            </div>

            {/* Cena */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Maksimalna cena: {maxPrice ? formatPrice(maxPrice) : "Bilo koja"}
              </label>
              <input
                type="range"
                min="0"
                max="50000"
                step="1000"
                value={maxPrice || 50000}
                onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-gray-500 mt-1">
                <span>0 RSD</span>
                <span>50.000 RSD</span>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="text-gray-600 dark:text-gray-400">
              Pronađeno {filteredTours.length} od {tours.length} tura
            </div>
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedDifficulty(null);
                setMaxPrice(null);
              }}
              className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Resetuj filtere
            </button>
          </div>
        </div>

        {/* Prikaz tura */}
        {filteredTours.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-xl font-medium mb-2">Nema pronađenih tura</h3>
            <p className="text-gray-500 dark:text-gray-400">
              Pokušajte da promenite filtere ili pokušajte ponovo kasnije.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTours.map((tour) => (
              <div
                key={tour.id}
                className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-300"
              >
                {/* Slika prve ključne tačke ili placeholder */}
                <div className="h-48 bg-gray-200 dark:bg-gray-700 relative">
                  {tour.first_keypoint?.image_url ? (
                    <img
                      src={tour.first_keypoint.image_url}
                      alt={tour.first_keypoint.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <svg
                        className="w-16 h-16"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-white dark:bg-gray-800 px-2 py-1 rounded text-sm font-medium">
                    {formatPrice(tour.price)}
                  </div>
                </div>

                {/* Sadržaj */}
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold">{tour.name}</h3>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {tour.total_length_km.toFixed(1)} km
                    </span>
                  </div>

                  <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                    {tour.description}
                  </p>

                  {/* Težina */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-yellow-500">
                        {renderDifficulty(tour.difficulty)}
                      </span>
                      <span className="text-sm text-gray-500">
                        {tour.difficulty}/5
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      Težina:{" "}
                      {tour.difficulty === 1 ? "Lako" :
                       tour.difficulty === 2 ? "Umereno" :
                       tour.difficulty === 3 ? "Srednje" :
                       tour.difficulty === 4 ? "Teško" : "Vrlo teško"}
                    </div>
                  </div>

                  {/* Prva ključna tačka */}
                  {tour.first_keypoint && (
                    <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <h4 className="font-medium mb-1">Početna tačka:</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {tour.first_keypoint.name}
                      </p>
                      {tour.first_keypoint.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {tour.first_keypoint.description}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Tagovi */}
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-2">
                      {tour.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Autor i dugme */}
                  <div className="flex justify-between items-center mt-4 pt-4 border-t">
                   {/* <div className="text-sm text-gray-500">
                      Autor: {tour.author_name || `ID: ${tour.author_id}`}
                    </div>*/}
                    <Link
                      to={`/tour/${tour.id}`}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Vidi detalje
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Paginacija (opciono) */}
        {filteredTours.length > 0 && (
          <div className="mt-8 flex justify-center">
            <nav className="flex items-center gap-2">
              <button className="px-3 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                Prethodna
              </button>
              <button className="px-3 py-2 bg-blue-600 text-white rounded-lg">1</button>
              <button className="px-3 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                2
              </button>
              <button className="px-3 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                3
              </button>
              <button className="px-3 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                Sledeća
              </button>
            </nav>
          </div>
        )}
      </div>
    </Layout>
  );
}