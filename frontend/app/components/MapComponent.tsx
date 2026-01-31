import { useEffect, useRef, useState } from "react";

interface KeyPoint {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  order: number;
}

interface MapComponentProps {
  latitude?: number;
  longitude?: number;
  onMapClick: (lat: number, lng: number) => void;
  className?: string;
  keyPoints?: KeyPoint[];
  editingKeyPointId?: number | null;
  showUserLocation?: boolean; // true for tourists, false for guides
}

export default function MapComponent({ 
  latitude, 
  longitude, 
  onMapClick, 
  className = "w-full h-96",
  keyPoints = [],
  editingKeyPointId = null,
  showUserLocation = true // Default to showing user location (tourist mode)
}: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const keyPointMarkersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!mapRef.current || !isClient) return;

    const initializeMap = async () => {
      try {
        const L = await import("leaflet");
        await import("leaflet/dist/leaflet.css");

        // Fix default icon paths
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        });

        // Initialize map
        const initialCenter: [number, number] = latitude && longitude 
          ? [latitude, longitude] 
          : keyPoints.length > 0 
          ? [keyPoints[0].latitude, keyPoints[0].longitude]
          : [45.267136, 19.833549]; // Novi Sad default

        const map = L.map(mapRef.current!).setView(initialCenter, 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        // Handle map clicks
        map.on('click', (e: any) => {
          const { lat, lng } = e.latlng;
          onMapClick(lat, lng);
        });

        mapInstanceRef.current = map;

        // Initial render
        updateMapContent(L, map);
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    };

    initializeMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isClient]);

  // Update map content when data changes
  useEffect(() => {
    if (!mapInstanceRef.current || !isClient) return;

    const updateContent = async () => {
      const L = await import("leaflet");
      updateMapContent(L, mapInstanceRef.current);
    };

    updateContent();
  }, [latitude, longitude, keyPoints, editingKeyPointId, showUserLocation, isClient]);

  const updateMapContent = async (L: any, map: any) => {
    // Clear existing markers and polyline
    keyPointMarkersRef.current.forEach(marker => map.removeLayer(marker));
    keyPointMarkersRef.current = [];
    
    if (userMarkerRef.current) {
      map.removeLayer(userMarkerRef.current);
      userMarkerRef.current = null;
    }

    if (polylineRef.current) {
      map.removeLayer(polylineRef.current);
      polylineRef.current = null;
    }

    // ALWAYS SHOW KEYPOINTS if they exist
    if (keyPoints.length > 0) {
      // Add keypoint markers
      keyPoints.forEach(kp => {
        const isEditing = editingKeyPointId === kp.id;
        
        const icon = L.divIcon({
          className: 'custom-div-icon',
          html: `<div style="
            width: 30px;
            height: 30px;
            background-color: ${isEditing ? '#3b82f6' : '#10b981'};
            color: white;
            border: 3px solid white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 14px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            ${isEditing ? 'animation: pulse 2s infinite;' : ''}
          ">${kp.order}</div>
          ${isEditing ? `<style>
            @keyframes pulse {
              0%, 100% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.2); opacity: 0.8; }
            }
          </style>` : ''}`,
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        });

        const marker = L.marker([kp.latitude, kp.longitude], { icon })
          .bindPopup(`<b>${kp.order}. ${kp.name}</b>${isEditing ? '<br/><span style="color: blue;">Uređivanje...</span>' : ''}`)
          .addTo(map);

        keyPointMarkersRef.current.push(marker);
      });

      // Draw polyline between keypoints
      if (keyPoints.length > 1) {
        const sortedPoints = [...keyPoints].sort((a, b) => a.order - b.order);
        const latLngs = sortedPoints.map(kp => [kp.latitude, kp.longitude] as [number, number]);
        
        const polyline = L.polyline(latLngs, { 
          color: '#3b82f6', 
          weight: 3, 
          opacity: 0.7,
          dashArray: '10, 5'
        }).addTo(map);
        
        polylineRef.current = polyline;
      }

      // Fit map view to show all keypoints
      const latLngs = keyPoints.map(kp => [kp.latitude, kp.longitude] as [number, number]);
      const bounds = L.latLngBounds(latLngs);
      map.fitBounds(bounds, { 
        padding: [20, 20],
        maxZoom: keyPoints.length === 1 ? 15 : undefined // Don't zoom too much for single point
      });

      // If editing a specific keypoint, still center on it after fitting bounds
      if (editingKeyPointId && !showUserLocation) {
        const editingKp = keyPoints.find(kp => kp.id === editingKeyPointId);
        if (editingKp) {
          setTimeout(() => {
            map.setView([editingKp.latitude, editingKp.longitude], Math.max(map.getZoom(), 15));
          }, 100);
        }
      }
    }

    // SHOW USER LOCATION (red dot) - for tourists
    if (showUserLocation && latitude && longitude) {
      const userIcon = L.divIcon({
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
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.2); opacity: 0.7; }
          }
        </style>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      userMarkerRef.current = L.marker([latitude, longitude], { icon: userIcon })
        .bindPopup('<b>Vaša lokacija</b>')
        .addTo(map);

      // If there are keypoints, include user location in bounds
      if (keyPoints.length > 0) {
        const allLatLngs = [
          ...keyPoints.map(kp => [kp.latitude, kp.longitude] as [number, number]),
          [latitude, longitude] as [number, number]
        ];
        const bounds = L.latLngBounds(allLatLngs);
        map.fitBounds(bounds, { padding: [20, 20] });
      } else {
        // Pan to user location if no keypoints
        map.panTo([latitude, longitude]);
      }
    }

    // GUIDE MODE - Show default marker for new keypoint selection (not editing existing)
    if (!showUserLocation && latitude && longitude && !editingKeyPointId) {
      // Use default Leaflet marker
      userMarkerRef.current = L.marker([latitude, longitude])
        .bindPopup('<b>Odabrana lokacija za novu ključnu tačku</b>')
        .addTo(map);

      // Pan to selected location
      map.panTo([latitude, longitude]);
    }
  };

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
      <div 
        ref={mapRef} 
        className="w-full h-full rounded-lg relative" 
        style={{ zIndex: 1 }}
      />
    </div>
  );
}