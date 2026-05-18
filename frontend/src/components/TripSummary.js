import React from 'react';
import './TripSummary.css';

export default function TripSummary({ summary, stops }) {
  const fuelStops = stops.filter(s => s.type === 'fuel').length;
  const restStops = stops.filter(s => s.type === 'rest' || s.type === 'cycle_reset').length;

  const cards = [
    { icon: '📏', label: 'Total Distance', value: `${summary.total_miles.toLocaleString()} mi` },
    { icon: '📅', label: 'Trip Days', value: `${summary.total_days} day${summary.total_days !== 1 ? 's' : ''}` },
    { icon: '⏱️', label: 'Cycle Hours Used', value: `${summary.cycle_hours_used} / 70 hrs` },
    { icon: '⛽', label: 'Fuel Stops', value: fuelStops },
  ];

  return (
    <div className="trip-summary">
      <div className="route-path">
        <div className="route-point current">
          <span className="rp-dot" />
          <span className="rp-label">{summary.current_location?.split(',').slice(0,2).join(',')}</span>
        </div>
        <div className="route-arrow">→</div>
        <div className="route-point pickup">
          <span className="rp-dot" />
          <span className="rp-label">{summary.pickup_location?.split(',').slice(0,2).join(',')}</span>
        </div>
        <div className="route-arrow">→</div>
        <div className="route-point dropoff">
          <span className="rp-dot" />
          <span className="rp-label">{summary.dropoff_location?.split(',').slice(0,2).join(',')}</span>
        </div>
      </div>
      <div className="summary-cards">
        {cards.map((c) => (
          <div className="summary-card" key={c.label}>
            <span className="sc-icon">{c.icon}</span>
            <div>
              <div className="sc-value">{c.value}</div>
              <div className="sc-label">{c.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
