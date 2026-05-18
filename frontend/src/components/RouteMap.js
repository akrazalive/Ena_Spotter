import React, { useEffect, useRef, useState } from 'react';
import './RouteMap.css';

const STOP_COLORS = {
  current:     '#1e293b',
  pickup:      '#f59e0b',
  dropoff:     '#16a34a',
  fuel:        '#7c3aed',
  rest:        '#dc2626',
  cycle_reset: '#dc2626',
};

function loadLeaflet() {
  return new Promise((resolve) => {
    if (window.L) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = resolve;
    document.head.appendChild(script);
  });
}

function buildMap(container, route, stops) {
  const L = window.L;
  const map = L.map(container, { zoomControl: true });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18,
  }).addTo(map);

  const bounds = [];

  if (route.geometry && route.geometry.coordinates) {
    const latlngs = route.geometry.coordinates.map(([lon, lat]) => [lat, lon]);
    L.polyline(latlngs, { color: '#1d4ed8', weight: 4, opacity: 0.85 }).addTo(map);
    latlngs.forEach(ll => bounds.push(ll));
  }

  route.waypoints.forEach((wp) => {
    const color = STOP_COLORS[wp.type] || '#1e293b';
    const icon = L.divIcon({
      className: '',
      html: `<div style="background:${color};width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35);"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
    const marker = L.marker([wp.lat, wp.lon], { icon }).addTo(map);
    marker.bindPopup(`
      <div style="font-family:Inter,sans-serif;min-width:150px">
        <strong style="color:#0f172a;text-transform:capitalize">${wp.type}</strong><br/>
        <span style="font-size:0.8rem;color:#64748b">${wp.label}</span>
      </div>
    `);
    bounds.push([wp.lat, wp.lon]);
  });

  if (bounds.length > 0) {
    map.fitBounds(bounds, { padding: [40, 40] });
  }

  // invalidate after paint
  setTimeout(() => map.invalidateSize(), 150);

  return map;
}

export default function RouteMap({ route, stops, visible }) {
  const mapRef         = useRef(null);
  const mapInstanceRef = useRef(null);
  const [leafletReady, setLeafletReady] = useState(!!window.L);

  // Step 1: ensure Leaflet is loaded
  useEffect(() => {
    if (window.L) { setLeafletReady(true); return; }
    loadLeaflet().then(() => setLeafletReady(true));
  }, []);

  // Step 2: build map once Leaflet is ready
  useEffect(() => {
    if (!leafletReady || !mapRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    mapInstanceRef.current = buildMap(mapRef.current, route, stops);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [leafletReady, route, stops]);

  // Step 3: invalidate when tab becomes visible
  useEffect(() => {
    if (visible && mapInstanceRef.current) {
      setTimeout(() => mapInstanceRef.current?.invalidateSize(), 50);
    }
  }, [visible]);

  const stopTypes = [
    { type: 'current', label: 'Current Location' },
    { type: 'pickup',  label: 'Pickup' },
    { type: 'dropoff', label: 'Dropoff' },
    { type: 'fuel',    label: 'Fuel Stop' },
    { type: 'rest',    label: 'Rest Stop' },
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
      {!leafletReady && (
        <div style={{ height: 420, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.875rem' }}>
          Loading map...
        </div>
      )}
      <div ref={mapRef} className="map-canvas" style={{ display: leafletReady ? 'block' : 'none' }} />
      <div className="map-stats">
        <div className="map-stat"><strong>{route.total_distance_miles} mi</strong><span>Total Distance</span></div>
        <div className="map-stat"><strong>{route.dist_to_pickup_miles} mi</strong><span>To Pickup</span></div>
        <div className="map-stat"><strong>{route.dist_pickup_to_dropoff_miles} mi</strong><span>To Dropoff</span></div>
        <div className="map-stat"><strong>{stops.filter(s => s.type === 'fuel').length}</strong><span>Fuel Stops</span></div>
      </div>
    </div>
  );
}
