import { useEffect, useRef, useState } from "react";

interface KeyPoint {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  order: number;
}

interface CompletedKeyPoint {
  id: number;
  execution_id: number;
  key_point_id: number;
  completed_at: string;
}

interface MapComponentProps {
  latitude?: number | null;
  longitude?: number | null;
  onMapClick: (lat: number, lng: number) => void;
  className?: string;
  keyPoints?: KeyPoint[];
  completedKeyPoints?: CompletedKeyPoint[]; // Add this prop
  editingKeyPointId?: number | null;
  showUserLocation?: boolean; // true for tourists, false for guides
}

export default function MapComponent({ 
  latitude, 
  longitude, 
  onMapClick, 
  className = "w-full h-96",
  keyPoints = [],
  completedKeyPoints = [], // Add this prop
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
        const hasUserCoords =
          latitude != null && longitude != null;

        const initialCenter: [number, number] = hasUserCoords
          ? [latitude as number, longitude as number]
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
      console.log("Updating map with completed keypoints:", completedKeyPoints);
      updateMapContent(L, mapInstanceRef.current);
    };

    updateContent();
  }, [latitude, longitude, keyPoints, completedKeyPoints, editingKeyPointId, showUserLocation, isClient]);

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

    // Create a set of completed keypoint IDs for fast lookup
    const completedIds = new Set(completedKeyPoints.map(ckp => ckp.key_point_id));
    console.log("Completed keypoint IDs:", Array.from(completedIds));

    // ALWAYS SHOW KEYPOINTS if they exist
    if (keyPoints.length > 0) {
      // Add keypoint markers
      keyPoints.forEach(kp => {
        const isEditing = editingKeyPointId === kp.id;
        const isCompleted = completedIds.has(kp.id);
        
        console.log(`Keypoint ${kp.id} (${kp.name}): completed=${isCompleted}`);
        
        // Choose color based on completion status
        let backgroundColor = '#10b981'; // Green for completed
        if (isEditing) {
          backgroundColor = '#3b82f6'; // Blue for editing
        } else if (!isCompleted && showUserLocation) {
          backgroundColor = '#6b7280'; // Gray for uncompleted (tourist mode)
        }
        
        const icon = L.divIcon({
          className: 'custom-div-icon',
          html: `<div style="
            width: 30px;
            height: 30px;
            background-color: ${backgroundColor};
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
            ${isCompleted && !isEditing ? 'border-color: #10b981; box-shadow: 0 0 0 2px #10b981;' : ''}
          ">${isCompleted ? '✓' : kp.order}</div>
          ${isEditing ? `<style>
            @keyframes pulse {
              0%, 100% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.2); opacity: 0.8; }
            }
          </style>` : ''}`,
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        });

        const statusText = isCompleted ? '<br/><span style="color: green;">✅ Završeno!</span>' : 
                          isEditing ? '<br/><span style="color: blue;">Uređivanje...</span>' : '';

        const marker = L.marker([kp.latitude, kp.longitude], { icon })
          .bindPopup(`<b>${kp.order}. ${kp.name}</b>${statusText}`)
          .addTo(map);

        keyPointMarkersRef.current.push(marker);
      });

      // Draw polyline between keypoints with different styles for completed segments
      if (keyPoints.length > 1) {
        const sortedPoints = [...keyPoints].sort((a, b) => a.order - b.order);
        
        // Draw individual segments with different colors
        for (let i = 0; i < sortedPoints.length - 1; i++) {
          const currentPoint = sortedPoints[i];
          const nextPoint = sortedPoints[i + 1];
          
          const isCurrentCompleted = completedIds.has(currentPoint.id);
          const isNextCompleted = completedIds.has(nextPoint.id);
          
          // Segment is green if both points are completed, gray otherwise
          const segmentColor = (isCurrentCompleted && isNextCompleted) ? '#10b981' : '#94a3b8';
          const segmentOpacity = (isCurrentCompleted && isNextCompleted) ? 0.8 : 0.5;
          
          const segment = L.polyline(
            [[currentPoint.latitude, currentPoint.longitude], [nextPoint.latitude, nextPoint.longitude]], 
            { 
              color: segmentColor,
              weight: 3,
              opacity: segmentOpacity,
              dashArray: (isCurrentCompleted && isNextCompleted) ? undefined : '10, 5'
            }
          ).addTo(map);
          
          keyPointMarkersRef.current.push(segment); // Add to markers array for cleanup
        }
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
    const hasUserCoords =
      latitude != null && longitude != null;

    if (showUserLocation && hasUserCoords) {
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

      userMarkerRef.current = L.marker(
        [latitude as number, longitude as number],
        { icon: userIcon }
      )
        .bindPopup('<b>Vaša lokacija</b>')
        .addTo(map);

      if (keyPoints.length > 0) {
        const allLatLngs = [
          ...keyPoints.map(
            kp => [kp.latitude, kp.longitude] as [number, number]
          ),
          [latitude as number, longitude as number] as [number, number]
        ];
        const bounds = L.latLngBounds(allLatLngs);
        map.fitBounds(bounds, { padding: [20, 20] });
      } else {
        map.panTo([latitude as number, longitude as number]);
      }
    }

    // GUIDE MODE - Show default marker for new keypoint selection (not editing existing)
    if (!showUserLocation && hasUserCoords && !editingKeyPointId) {
      userMarkerRef.current = L.marker(
        [latitude as number, longitude as number]
      )
        .bindPopup('<b>Odabrana lokacija za novu ključnu tačku</b>')
        .addTo(map);

      map.panTo([latitude as number, longitude as number]);
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