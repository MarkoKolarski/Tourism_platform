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

// Custom ikona za lokaciju korisnika
const userLocationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Funkcija za kreiranje numerisanih ikona
const createNumberedIcon = (number: number, isEditing: boolean) => {
  const iconUrl = isEditing 
    ? 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png'
    : 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png';

  return L.divIcon({
    html: `<div style="position: relative; text-align: center;">
             <img src="${iconUrl}" style="width: 25px; height: 41px;">
             <span style="position: absolute; top: 6px; left: 0; right: 0; color: white; font-size: 12px; font-weight: bold;">${number}</span>
           </div>`,
    className: 'custom-div-icon',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });
};

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
          icon={createNumberedIcon(kp.order, editingKpId === kp.id)}
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