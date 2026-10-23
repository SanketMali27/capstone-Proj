import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import { MapPin } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Vite asset bundling for default Leaflet marker icon
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function MapView({ coordinates, label = 'Donor Location' }) {
  const isValid =
    Array.isArray(coordinates) &&
    coordinates.length === 2 &&
    Number.isFinite(coordinates[0]) &&
    Number.isFinite(coordinates[1]) &&
    !(coordinates[0] === 0 && coordinates[1] === 0) &&
    coordinates[1] >= -90 &&
    coordinates[1] <= 90 &&
    coordinates[0] >= -180 &&
    coordinates[0] <= 180;

  if (!isValid) {
    return (
      <div className="flex h-44 w-full flex-col items-center justify-center rounded-3xl border border-stone-200 bg-stone-50 p-4 text-center text-slate-500">
        <MapPin className="h-6 w-6 text-slate-400 mb-1" />
        <span className="text-xs font-medium">Location coordinates not provided</span>
        <span className="text-[11px] text-slate-400 mt-0.5">Physical collection address provided upon acceptance</span>
      </div>
    );
  }

  const [longitude, latitude] = coordinates;

  return (
    <div className="overflow-hidden rounded-3xl border border-stone-200 shadow-inner">
      <MapContainer
        center={[latitude, longitude]}
        zoom={13}
        scrollWheelZoom={false}
        className="h-44 w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[latitude, longitude]} icon={defaultIcon}>
          <Popup>{label}</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
