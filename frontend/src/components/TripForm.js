import React, { useState } from 'react';
import './TripForm.css';

export default function TripForm({ onSubmit, loading }) {
  const [form, setForm] = useState({
    current_location: '',
    pickup_location: '',
    dropoff_location: '',
    cycle_used_hrs: '',
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      cycle_used_hrs: parseFloat(form.cycle_used_hrs) || 0,
    });
  };

  const fields = [
    { name: 'current_location', label: 'Current Location', icon: '📍', placeholder: 'e.g. Chicago, IL' },
    { name: 'pickup_location', label: 'Pickup Location', icon: '📦', placeholder: 'e.g. Indianapolis, IN' },
    { name: 'dropoff_location', label: 'Dropoff Location', icon: '🏁', placeholder: 'e.g. Nashville, TN' },
  ];

  return (
    <form className="trip-form" onSubmit={handleSubmit}>
      <div className="form-header">
        <h2>Trip Details</h2>
        <p>Enter your route information below</p>
      </div>

      {fields.map((f) => (
        <div className="form-group" key={f.name}>
          <label htmlFor={f.name}>
            <span className="field-icon">{f.icon}</span>
            {f.label}
          </label>
          <input
            id={f.name}
            name={f.name}
            type="text"
            value={form[f.name]}
            onChange={handleChange}
            placeholder={f.placeholder}
            required
            autoComplete="off"
          />
        </div>
      ))}

      <div className="form-group">
        <label htmlFor="cycle_used_hrs">
          <span className="field-icon">⏱️</span>
          Current Cycle Used (hrs)
        </label>
        <div className="input-with-hint">
          <input
            id="cycle_used_hrs"
            name="cycle_used_hrs"
            type="number"
            min="0"
            max="70"
            step="0.5"
            value={form.cycle_used_hrs}
            onChange={handleChange}
            placeholder="0 – 70"
            required
          />
          <span className="input-hint">Max 70 hrs / 8 days</span>
        </div>
        {form.cycle_used_hrs !== '' && (
          <div className="cycle-bar">
            <div
              className="cycle-fill"
              style={{ width: `${Math.min((parseFloat(form.cycle_used_hrs) / 70) * 100, 100)}%` }}
            />
          </div>
        )}
      </div>

      <div className="assumptions-box">
        <h4>Assumptions</h4>
        <ul>
          <li>70 hrs / 8-day cycle</li>
          <li>11 hrs max driving/day</li>
          <li>10 hrs required rest</li>
          <li>30-min break after 8 hrs</li>
          <li>Fuel stop every 1,000 mi</li>
          <li>1 hr pickup &amp; dropoff</li>
        </ul>
      </div>

      <button type="submit" className="submit-btn" disabled={loading}>
        {loading ? (
          <><span className="btn-spinner" /> Calculating...</>
        ) : (
          <><span>🚀</span> Plan Trip</>
        )}
      </button>
    </form>
  );
}
