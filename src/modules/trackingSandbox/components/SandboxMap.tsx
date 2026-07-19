import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

// Leaflet custom marker icons
const pickupIcon = L.divIcon({
  html: `
    <div style="position: relative; width: 32px; height: 32px;">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 3px 4px rgba(0,0,0,0.3));">
        <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z" fill="#1de9b6" stroke="#ffffff" stroke-width="1.5"/>
        <circle cx="12" cy="9" r="3.5" fill="#ffffff"/>
      </svg>
    </div>
  `,
  className: 'custom-marker-pickup',
  iconSize: [32, 32],
  iconAnchor: [16, 32]
});

const destIcon = L.divIcon({
  html: `
    <div style="position: relative; width: 32px; height: 32px;">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 3px 4px rgba(0,0,0,0.3));">
        <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z" fill="#ff4081" stroke="#ffffff" stroke-width="1.5"/>
        <circle cx="12" cy="9" r="3.5" fill="#ffffff"/>
      </svg>
    </div>
  `,
  className: 'custom-marker-dest',
  iconSize: [32, 32],
  iconAnchor: [16, 32]
});

const driverIcon = L.divIcon({
  html: `
    <div style="position: relative; width: 36px; height: 36px;">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 3px 5px rgba(0,0,0,0.4));">
        <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z" fill="#1de9b6" stroke="#ffffff" stroke-width="1.5"/>
        <circle cx="12" cy="9" r="3.5" fill="#ffffff"/>
      </svg>
    </div>
  `,
  className: 'custom-driver-marker',
  iconSize: [36, 36],
  iconAnchor: [18, 36]
});

interface SandboxMapProps {
  pickup: [number, number] | null;
  destination: [number, number] | null;
  routePath: [number, number][];
  currentPosition: [number, number] | null;
}

// Map Auto-Bounds Recenter Hook
const RecenterMap: React.FC<{ pickup: [number, number] | null; destination: [number, number] | null }> = ({
  pickup,
  destination
}) => {
  const map = useMap();

  useEffect(() => {
    if (pickup && destination) {
      const bounds = L.latLngBounds([pickup, destination]);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (pickup) {
      map.setView(pickup, 14);
    } else if (destination) {
      map.setView(destination, 14);
    }
  }, [pickup, destination, map]);

  return null;
};

export const SandboxMap: React.FC<SandboxMapProps> = ({
  pickup,
  destination,
  routePath,
  currentPosition
}) => {
  const defaultCenter: [number, number] = pickup || [23.0225, 72.5714];

  return (
    <div className="w-full h-[400px] bg-muted/20 border border-border rounded-2xl overflow-hidden relative shadow-sm">
      <MapContainer
        center={defaultCenter}
        zoom={13}
        className="w-full h-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <RecenterMap pickup={pickup} destination={destination} />

        {pickup && (
          <Marker position={pickup} icon={pickupIcon} />
        )}

        {destination && (
          <Marker position={destination} icon={destIcon} />
        )}

        {/* Live Driver Marker Location */}
        {currentPosition && (
          <Marker position={currentPosition} icon={driverIcon} />
        )}

        {/* Driving Route Polyline Overlay */}
        {routePath.length > 0 && (
          <Polyline
            positions={routePath}
            color="hsl(var(--primary))"
            weight={5}
          />
        )}
      </MapContainer>
    </div>
  );
};
