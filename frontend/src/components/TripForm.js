import React, { useState } from 'react';
import LocationInput from './LocationInput';
import './TripForm.css';

const INITIAL = {
  current:  { label: '', lat: null, lon: null },
  pickup:   { label: '', lat: null, lon: null },
  dropoff:  { label: '', lat: null, lon: null },
  cycle:    '',
};

export default function TripForm({ onSubmit, loading }) {
  const [form, setForm] = useState(INITIAL);

  const setLoc = (field) => (val) => setForm(f => ({ ...f, [field]: val }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      current_location:  form.current.label,
      pickup_location:   form.pickup.label,
      dropoff_location:  form.dropoff.label,
      cycle_used_hrs:    parseFloat(form.cycle) || 0,
      // pass resolved coords so backend skips geocoding
      current_lat: form.current.lat,
      current_lon: form.current.lon,
      pickup_lat:  form.pickup.lat,
      pickup_lon:  form.pickup.lon,
      dropoff_lat: form.dropoff.lat,
      dropoff_lon: form.dropoff.lon,
    });
  };

  const cycleVal = parseFloat(form.cycle) || 0;

  return (
    <form className="trip-form" onSubmit={handleSubmit}>
      <div className="form-header">
        <h2>Trip Details</h2>
        <p>Enter your route information below</p>
      </div>

      <LocationInput
        id="current_location"
        name="current_location"
        label="Current Location"
        icon="📍"
        placeholder="e.g. Chicago, IL"
        value={form.current}
        onChange={setLoc('current')}
      />

      <LocationInput
        id="pickup_location"
        name="pickup_location"
        label="Pickup Location"
        icon="📦"
        placeholder="e.g. Indianapolis, IN"
        value={form.pickup}
        onChange={setLoc('pickup')}
      />

      <LocationInput
        id="dropoff_location"
        name="dropoff_location"
        label="Dropoff Location"
        icon="🏁"
        placeholder="e.g. Nashville, TN"
        value={form.dropoff}
        onChange={setLoc('dropoff')}
      />

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
            value={form.cycle}
            onChange={e => setForm(f => ({ ...f, cycle: e.target.value }))}
            placeholder="0 – 70"
            required
          />
          <span className="input-hint">Max 70 hrs</span>
        </div>
        {form.cycle !== '' && (
          <div className="cycle-bar">
            <div className="cycle-fill" style={{ width: `${Math.min((cycleVal / 70) * 100, 100)}%` }} />
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
        {loading ? <><span className="btn-spinner" /> Calculating...</> : <><span>🚀</span> Plan Trip</>}
      </button>
    </form>
  );
}
