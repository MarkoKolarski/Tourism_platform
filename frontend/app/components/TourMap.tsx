import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Popravka za ikone u Leaflet-u
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
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
  selectedPosition: [number, number] | null;
  onMapClick: (lat: number, lng: number) => void;
}

export default function TourMap({ 
  center, 
  keyPoints, 
  selectedPosition, 
  onMapClick 
}: TourMapProps) {
  const [MapClickHandler, setMapClickHandler] = useState<any>(null);

  useEffect(() => {
    // Dinamički učitaj useMapEvents samo na klijentu
    if (typeof window !== "undefined") {
      import("react-leaflet").then((module) => {
        const { useMapEvents } = module;
        
        const Handler = () => {
          useMapEvents({
            click(e) {
              onMapClick(e.latlng.lat, e.latlng.lng);
            },
          });
          return null;
        };
        
        setMapClickHandler(() => Handler);
      });
    }
  }, [onMapClick]);

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
        <Marker key={kp.id} position={[kp.latitude, kp.longitude]}>
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
      {MapClickHandler && <MapClickHandler />}
    </MapContainer>
  );
}