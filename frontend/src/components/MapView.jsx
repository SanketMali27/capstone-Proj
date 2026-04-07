import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export default function MapView({ coordinates }) {
  if (!coordinates?.length || (coordinates[0] === 0 && coordinates[1] === 0)) {
    return <div className="h-40 rounded-3xl bg-stone-100" />;
  }

  const [longitude, latitude] = coordinates;

  return (
    <div className="overflow-hidden rounded-3xl border border-stone-200">
      <MapContainer center={[latitude, longitude]} zoom={13} scrollWheelZoom={false} className="h-40 w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[latitude, longitude]} />
      </MapContainer>
    </div>
  );
}
