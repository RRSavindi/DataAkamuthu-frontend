import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Popup, Marker } from 'react-leaflet';
import { icon } from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import axios from 'axios';
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import 'leaflet/dist/leaflet.css';
import './App.css';

const locationIcon = icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function App() {
  const [profiles, setProfiles] = useState([]);
  const [selectedData, setSelectedData] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);

  useEffect(() => {
    axios.get('http://localhost:5000/api/profiles')
      .then(res => {
        console.log('Profiles loaded:', res.data);  // Log for debugging
        setProfiles(res.data);
      })
      .catch(err => console.error('Error loading profiles:', err));
  }, []);

  const handleClick = (id, name) => {
    axios.get(`http://localhost:5000/api/profiles/${id}/data`)
      .then(res => {
        console.log('Data loaded for ID', id, ':', res.data);  // Log for debugging
        setSelectedData(res.data);
        setSelectedProfile(name);
      })
      .catch(err => console.error('Error loading data:', err));
  };

  const hasData = selectedData && selectedData.length > 0;
  const hasLightIntensity = hasData && selectedData.some(entry => entry.percentage_light_intensity != null);

  // Common helpers for trend data
  const getTimeValue = (entry) => {
    if (entry.timestamp) {
      if (entry.timestamp.$date) return new Date(entry.timestamp.$date).getTime();
      if (typeof entry.timestamp === 'string') return new Date(entry.timestamp).getTime();
      if (typeof entry.timestamp === 'number') return entry.timestamp;
    }
    return 0;
  };

  const formatTimestamp = (entry) => {
    if (entry.timestamp) {
      if (entry.timestamp.$date) return new Date(entry.timestamp.$date).toLocaleString();
      if (typeof entry.timestamp === 'string') return new Date(entry.timestamp).toLocaleString();
      if (typeof entry.timestamp === 'number') return new Date(entry.timestamp).toLocaleString();
    }
    return 'Invalid';
  };

  return (
    <>
      <div className="header-bar">
        <h1>Weather Profiles Map</h1>
      </div>
      <div className="top-layout" style={{ flexDirection: hasData ? 'row' : 'column' }}>
        <div className="map-panel" style={{ flex: hasData ? '1 1 65%' : '1 1 100%' }}>
          <MapContainer center={[7.87, 80.77]} zoom={8} className="map-full">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {profiles.map(profile => {
              const position = Array.isArray(profile.latestCoords) && profile.latestCoords.length === 2
                ? profile.latestCoords
                : null;
              const displayName = profile.name || profile.profileName || 'Unnamed profile';
              if (!position) return null; // Skip invalid coordinates
              return (
                <Marker
                  key={profile.id}
                  position={position}
                  icon={locationIcon}
                  eventHandlers={{
                    click: () => handleClick(profile.id, displayName)  // Use eventHandlers for reliable clicks
                  }}
                >
                  <Popup>
                    <div>
                      <strong>{displayName}</strong><br />
                      Coordinates: {position[0].toFixed(4)}, {position[1].toFixed(4)}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        {hasData && (
        <div className="charts-panel">
          <div className="charts-container">
              <h3 style={{ margin: '0 0 8px', color: '#1f2937', fontSize: '15px', fontWeight: 600 }}>Trends Over Time</h3>
              {[
                { key: 'temperature', label: 'Temperature', color: '#ef4444' },
                { key: 'humidity', label: 'Humidity', color: '#3b82f6' },
                { key: 'pressure', label: 'Pressure', color: '#10b981' },
                ...(hasLightIntensity ? [{ key: 'percentage_light_intensity', label: 'Light Intensity', color: '#f59e0b' }] : [])
              ].map(({ key, label, color }) => {
                const seriesData = [...selectedData]
                  .filter(entry => (entry.temperature != null || entry.humidity != null || entry.pressure != null || entry.percentage_light_intensity != null))
                  .filter(entry => entry[key] != null)
                  .sort((a, b) => getTimeValue(a) - getTimeValue(b))
                  .map(entry => ({
                    time: formatTimestamp(entry),
                    value: entry[key]
                  }));

                return (
                  <div key={key} style={{ marginBottom: '8px', padding: '10px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <h4 style={{ margin: '0 0 4px', color: '#374151', fontSize: '12px' }}>{label}</h4>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={seriesData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="time" minTickGap={30} tick={{ fontSize: 10 }} />
                        <YAxis allowDecimals tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(value) => value ?? 'N/A'} labelStyle={{ fontWeight: 600 }} />
                        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} activeDot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                );
              })}
            </div>
        </div>
        )}
      </div>

      <div className="table-panel">
        {hasData ? (
          <div className="table-card">
                <h2>Time-Series Data{selectedProfile ? ` - ${selectedProfile}` : ''}</h2>
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>Temperature</th>
                        <th>Humidity</th>
                        <th>Pressure</th>
                        {hasLightIntensity && <th>Light Intensity(%)</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedData
                        .sort((a, b) => getTimeValue(b) - getTimeValue(a))
                        .map((entry, idx) => {
                          let dateStr = 'Invalid or Missing Date';
                          if (entry.timestamp) {
                            if (entry.timestamp.$date) {
                              dateStr = new Date(entry.timestamp.$date).toLocaleString();
                            } else if (typeof entry.timestamp === 'string') {
                              dateStr = new Date(entry.timestamp).toLocaleString();
                            } else if (typeof entry.timestamp === 'number') {
                              dateStr = new Date(entry.timestamp).toLocaleString();
                            }
                          }
                          return (
                            <tr key={idx}>
                              <td>{dateStr}</td>
                              <td>{entry.temperature || 'N/A'}</td>
                              <td>{entry.humidity || 'N/A'}</td>
                              <td>{entry.pressure || 'N/A'}</td>
                              {hasLightIntensity && <td>{entry.percentage_light_intensity || 'N/A'}</td>}
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
          </div>
        ) : selectedData ? (
          <div className="table-card empty-card">No time-series data available for this profile.</div>
        ) : (
          <div className="table-card empty-card">Click a marker to load data.</div>
        )}
      </div>
    </>
  );
}

export default App;