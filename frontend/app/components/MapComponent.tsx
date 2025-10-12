import { useEffect, useRef, useState } from "react";

// Dynamic import for Leaflet to avoid SSR issues
interface MapComponentProps {
  latitude?: number;
  longitude?: number;
  onMapClick: (lat: number, lng: number) => void;
  className?: string;
}

export default function MapComponent({ 
  latitude, 
  longitude, 
  onMapClick, 
  className = "w-full h-96" 
}: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [isClient, setIsClient] = useState(false);

  // Check if we're on client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!mapRef.current || !isClient) return;

    // Dynamic import Leaflet only on client side
    const initializeMap = async () => {
      try {
        const L = await import("leaflet");
        
        // Import CSS
        await import("leaflet/dist/leaflet.css");

        // Fix default icon issue
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        });

        // Initialize map centered on Novi Sad
        const map = L.map(mapRef.current!).setView([45.267136, 19.833549], 13);

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        // Create custom icon for current location
        const customIcon = L.divIcon({
          className: 'custom-div-icon',
          html: `<div style="
            width: 20px;
            height: 20px;
            background-color: #ef4444;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            animation: pulse 2s infinite;
          "></div>
          <style>
            @keyframes pulse {
              0% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.2); opacity: 0.7; }
              100% { transform: scale(1); opacity: 1; }
            }
          </style>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });

        // Handle map clicks
        map.on('click', (e: any) => {
          const { lat, lng } = e.latlng;
          onMapClick(lat, lng);
        });

        mapInstanceRef.current = map;

        // Add marker if coordinates are provided
        if (latitude && longitude) {
          const marker = L.marker([latitude, longitude], { icon: customIcon }).addTo(map);
          markerRef.current = marker;
        }
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    };

    initializeMap();

    // Cleanup on unmount
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isClient]); // Only run when client is ready

  // Update marker when coordinates change
  useEffect(() => {
    if (!mapInstanceRef.current || !isClient) return;

    const updateMarker = async () => {
      try {
        const L = await import("leaflet");

        // Remove existing marker
        if (markerRef.current) {
          mapInstanceRef.current.removeLayer(markerRef.current);
          markerRef.current = null;
        }

        // Add new marker if coordinates exist
        if (latitude && longitude) {
          const customIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="
              width: 20px;
              height: 20px;
              background-color: #ef4444;
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
              animation: pulse 2s infinite;
            "></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });

          const marker = L.marker([latitude, longitude], { icon: customIcon }).addTo(mapInstanceRef.current);
          markerRef.current = marker;

          // Pan to new location
          mapInstanceRef.current.panTo([latitude, longitude]);
        }
      } catch (error) {
        console.error('Error updating marker:', error);
      }
    };

    updateMarker();
  }, [latitude, longitude, isClient]);

  // Show loading state on server side or while loading
  if (!isClient) {
    return (
      <div className={className}>
        <div className="w-full h-full rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
            <p className="text-gray-600 dark:text-gray-400">Učitavam mapu...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div ref={mapRef} className="w-full h-full rounded-lg" />
    </div>
  );
}