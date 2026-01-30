import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Popravka za ikone u Leaflet-u
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom ikona za lokaciju korisnika (pulsirajući crveni krug)
const userLocationIcon = L.divIcon({
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
  iconAnchor: [10, 10],
});

interface TourMapProps {
  center: [number, number];
  keyPoints: Array<{
    id: number;
    name: string;
    order: number;
    latitude: number;
    longitude: number;
  }>;
  selectedPosition?: [number, number] | null;
  onMapClick?: (lat: number, lng: number) => void;
  userLocation?: { latitude: number; longitude: number } | null;
  editingKpId?: number | null;
}

function MapClickHandler({ onMapClick }: { onMapClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function TourMap({ 
  center, 
  keyPoints, 
  selectedPosition, 
  onMapClick,
  userLocation,
  editingKpId,
}: TourMapProps) {
  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {/* Postojeće ključne tačke */}
      {keyPoints.map((kp) => (
        <Marker 
          key={kp.id} 
          position={[kp.latitude, kp.longitude]}
        >
          <Popup>
            <strong>{kp.order}. {kp.name}</strong>
          </Popup>
        </Marker>
      ))}
      {/* Odabrana pozicija za novu tačku */}
      {selectedPosition && (
        <Marker position={selectedPosition}>
          <Popup>
            <strong>Nova tačka</strong>
          </Popup>
        </Marker>
      )}
      {/* Lokacija korisnika */}
      {userLocation && (
        <Marker 
          position={[userLocation.latitude, userLocation.longitude]}
          icon={userLocationIcon}
        >
          <Popup>
            <strong>Vaša lokacija</strong>
          </Popup>
        </Marker>
      )}
      {onMapClick && <MapClickHandler onMapClick={onMapClick} />}
    </MapContainer>
  );
}