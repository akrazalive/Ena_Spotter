import React, { useState } from 'react';
import TripForm from './components/TripForm';
import RouteMap from './components/RouteMap';
import ELDLogs from './components/ELDLogs';
import TripSummary from './components/TripSummary';
import { API_BASE } from './api';
import './App.css';

export default function App() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('map');

  const handlePlan = async (formData) => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/trip/plan/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to plan trip');
      setResult(data);
      setActiveTab('map');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
        <div className="logo">
            <div className="logo-mark">🚛</div>
            <div>
              <h1>ELD Trip Planner</h1>
              <p>Hours of Service Log Generator</p>
            </div>
          </div>
          <div className="header-badges">
            <span className="header-badge">70 hrs / 8 days</span>
            <span className="header-badge">Property Carrier</span>
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="layout">
          <aside className="sidebar">
            <TripForm onSubmit={handlePlan} loading={loading} />
            {error && <div className="error-box">{error}</div>}
          </aside>

          <section className="content">
            {!result && !loading && (
              <div className="empty-state">
                <div className="empty-icon">🗺️</div>
                <h2>Plan Your Trip</h2>
                <p>Enter your trip details on the left to generate route instructions and ELD log sheets.</p>
              </div>
            )}

            {loading && (
              <div className="loading-state">
                <div className="spinner" />
                <p>Calculating route and HOS logs...</p>
              </div>
            )}

            {result && (
              <>
                <TripSummary summary={result.summary} stops={result.stops} />
                <div className="tabs">
                  <button className={activeTab === 'map' ? 'tab active' : 'tab'} onClick={() => setActiveTab('map')}>
                    🗺️ Route Map
                  </button>
                  <button className={activeTab === 'logs' ? 'tab active' : 'tab'} onClick={() => setActiveTab('logs')}>
                    📋 ELD Log Sheets ({result.logs.length})
                  </button>
                </div>
                <div className="tab-content">
                  <div style={{ display: activeTab === 'map' ? 'block' : 'none' }}>
                    <RouteMap route={result.route} stops={result.stops} visible={activeTab === 'map'} />
                  </div>
                  <div style={{ display: activeTab === 'logs' ? 'block' : 'none' }}>
                    <ELDLogs logs={result.logs} summary={result.summary} />
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
