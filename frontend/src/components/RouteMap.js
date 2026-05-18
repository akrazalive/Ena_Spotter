import React, { useEffect, useRef } from 'react';
import './RouteMap.css';

const STOP_COLORS = {
  current: '#2563eb',
  pickup: '#f59e0b',
  dropoff: '#10b981',
  fuel: '#8b5cf6',
  rest: '#ef4444',
  cycle_reset: '#ef4444',
};

const STOP_ICONS = {
  current: '📍',
  pickup: '📦',
  dropoff: '🏁',
  fuel: '⛽',
  rest: '🛏️',
  cycle_reset: '🔄',
};

export default function RouteMap({ route, stops }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!window.L) return;
    const L = window.L;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapRef.current, { zoomControl: true });
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    const bounds = [];

    // Draw route geometry
    if (route.geometry && route.geometry.coordinates) {
      const latlngs = route.geometry.coordinates.map(([lon, lat]) => [lat, lon]);
      L.polyline(latlngs, {
        color: '#2563eb',
        weight: 4,
        opacity: 0.8,
        dashArray: null,
      }).addTo(map);
      latlngs.forEach(ll => bounds.push(ll));
    }

    // Add waypoint markers
    route.waypoints.forEach((wp) => {
      const color = STOP_COLORS[wp.type] || '#2563eb';
      const icon = L.divIcon({
        className: '',
        html: `<div style="
          background:${color};
          width:14px;height:14px;
          border-radius:50%;
          border:3px solid white;
          box-shadow:0 2px 8px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      const marker = L.marker([wp.lat, wp.lon], { icon }).addTo(map);
      marker.bindPopup(`
        <div style="font-family:Inter,sans-serif;min-width:160px">
          <div style="font-weight:600;color:#1a2744;margin-bottom:4px;text-transform:capitalize">${wp.type} Location</div>
          <div style="font-size:0.82rem;color:#64748b">${wp.label}</div>
        </div>
      `);
      bounds.push([wp.lat, wp.lon]);
    });

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [route, stops]);

  // Load Leaflet dynamically if not present
  useEffect(() => {
    if (!window.L) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => {
        // trigger re-render
        window.dispatchEvent(new Event('leaflet-loaded'));
      };
      document.head.appendChild(script);
    }
  }, []);

  const stopTypes = [
    { type: 'current', label: 'Current' },
    { type: 'pickup', label: 'Pickup' },
    { type: 'dropoff', label: 'Dropoff' },
    { type: 'fuel', label: 'Fuel Stop' },
    { type: 'rest', label: 'Rest Stop' },
  ];

  return (
    <div className="route-map-container">
      <div className="map-legend">
        {stopTypes.map(s => (
          <div className="legend-item" key={s.type}>
            <span className="legend-dot" style={{ background: STOP_COLORS[s.type] }} />
            <span>{s.label}</span>
          </div>
        ))}
      </div>
      <div ref={mapRef} className="map-canvas" />
      <div className="map-stats">
        <div className="map-stat">
          <strong>{route.total_distance_miles} mi</strong>
          <span>Total Distance</span>
        </div>
        <div className="map-stat">
          <strong>{route.dist_to_pickup_miles} mi</strong>
          <span>To Pickup</span>
        </div>
        <div className="map-stat">
          <strong>{route.dist_pickup_to_dropoff_miles} mi</strong>
          <span>To Dropoff</span>
        </div>
        <div className="map-stat">
          <strong>{stops.filter(s => s.type === 'fuel').length}</strong>
          <span>Fuel Stops</span>
        </div>
      </div>
    </div>
  );
}
