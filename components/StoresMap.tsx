'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CHAINS, ChainKey } from '@/lib/chains';

type NearbyStore = {
  id: string;
  chain: ChainKey;
  name: string;
  lat: number;
  lng: number;
  distanceKm: number;
  address?: string;
};

type Props = {
  stores: NearbyStore[];
  center: { lat: number; lng: number };
  selected: Set<string>;
  onToggle: (id: string) => void;
};

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points.map(p => L.latLng(p[0], p[1])));
    map.fitBounds(bounds.pad(0.2));
  }, [map, points]);
  return null;
}

export default function StoresMap({ stores, center, selected, onToggle }: Props) {
  const points: [number, number][] = [
    [center.lat, center.lng],
    ...stores.map(s => [s.lat, s.lng] as [number, number]),
  ];

  return (
    <div style={{ height: 360, borderRadius: 10, overflow: 'hidden' }}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <CircleMarker
          center={[center.lat, center.lng]}
          radius={8}
          pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.9 }}
        >
          <Popup>מיקום נוכחי</Popup>
        </CircleMarker>
        {stores.map(s => {
          const info = CHAINS[s.chain];
          const isSelected = selected.has(s.id);
          return (
            <CircleMarker
              key={s.id}
              center={[s.lat, s.lng]}
              radius={isSelected ? 12 : 8}
              pathOptions={{
                color: info.color,
                fillColor: info.color,
                fillOpacity: isSelected ? 0.95 : 0.55,
                weight: isSelected ? 3 : 1,
              }}
              eventHandlers={{ click: () => onToggle(s.id) }}
            >
              <Popup>
                <div style={{ minWidth: 160 }}>
                  <div style={{ fontWeight: 600 }}>
                    {info.he} — {s.name}
                  </div>
                  {s.address && <div style={{ color: '#666' }}>{s.address}</div>}
                  <div style={{ color: '#666' }}>{s.distanceKm.toFixed(2)} ק״מ</div>
                  <button
                    onClick={() => onToggle(s.id)}
                    style={{
                      marginTop: 6,
                      padding: '4px 8px',
                      border: '1px solid #ccc',
                      borderRadius: 6,
                      background: isSelected ? '#2563eb' : '#fff',
                      color: isSelected ? '#fff' : '#111',
                      cursor: 'pointer',
                    }}
                  >
                    {isSelected ? 'הסר בחירה' : 'בחר סופר'}
                  </button>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
        <FitBounds points={points} />
      </MapContainer>
    </div>
  );
}

// Marker isn't used (circle markers avoid the default-icon asset mess) but
// keeping the import ensures leaflet's CSS is loaded alongside the types.
void Marker;
