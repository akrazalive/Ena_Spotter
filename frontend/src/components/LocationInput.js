import React, { useState, useRef, useEffect, useCallback } from 'react';
import { API_BASE } from '../api';
import './LocationInput.css';

export default function LocationInput({ id, name, label, icon, placeholder, value, onChange }) {
  const [query, setQuery] = useState(value?.label || '');
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchSuggestions = useCallback((q) => {
    if (q.length < 2) { setSuggestions([]); setOpen(false); return; }
    setLoading(true);
    fetch(`${API_BASE}/api/trip/autocomplete/?q=${encodeURIComponent(q)}`)
      .then(r => r.json())
      .then(data => {
        setSuggestions(data.suggestions || []);
        setOpen(true);
      })
      .catch(() => setSuggestions([]))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    // Clear resolved coords when user types manually
    onChange({ label: q, lat: null, lon: null });
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(q), 300);
  };

  const handleSelect = (s) => {
    const label = s.subtext ? `${s.label}, ${s.subtext}` : s.label;
    setQuery(label);
    setSuggestions([]);
    setOpen(false);
    onChange({ label, lat: s.lat, lon: s.lon });
  };

  return (
    <div className="loc-input-wrap" ref={wrapperRef}>
      <label htmlFor={id}>
        <span className="field-icon">{icon}</span>
        {label}
      </label>
      <div className="loc-input-inner">
        <input
          id={id}
          name={name}
          type="text"
          autoComplete="off"
          value={query}
          onChange={handleChange}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          required
        />
        {loading && <span className="loc-spinner" />}
      </div>
      {open && suggestions.length > 0 && (
        <ul className="loc-dropdown">
          {suggestions.map((s, i) => (
            <li key={i} onMouseDown={() => handleSelect(s)}>
              <span className="loc-icon">📍</span>
              <span>
                <span className="loc-main">{s.label}</span>
                {s.subtext && <span className="loc-sub">{s.subtext}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
