import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { StatusBar } from '../../components/layout/StatusBar.jsx';

// Fix Leaflet default icon path issue with Vite
delete L.Icon.Default.prototype._getIconUrl;

function makeIcon(emoji, size = 36) {
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;background:#0E1720;border:2px solid #38BDF8;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:${size * 0.5}px;box-shadow:0 2px 8px rgba(0,0,0,0.5)">${emoji}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// UCT area as demo coords
const ME_POS = [-33.9575, 18.4608];
const PARTNER_POS = [-33.9541, 18.4632];
const PARTNER_NAME = 'Lerato M.';

function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => { map.setView(center, map.getZoom(), { animate: true }); }, [center, map]);
  return null;
}

export function LiveMapScreen() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [precision, setPrecision] = useState('exact'); // exact | block
  const [sharing, setSharing] = useState(true);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!sharing) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [sharing]);

  function formatTime(s) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${ss}s`;
    return `${ss}s`;
  }

  const center = [-33.956, 18.462];

  return (
    <div className="phone-inner">
      <StatusBar />
      <div className="screen" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

        {/* Header */}
        <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <button className="btn btn-ghost btn-sm" style={{ width: 'auto' }} onClick={() => navigate(-1)}>←</button>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>📍 Live Map</div>
            <div style={{ fontSize: 12, color: sharing ? 'var(--sealed)' : 'var(--ink3)' }}>
              {sharing ? `Sharing · ${formatTime(elapsed)}` : 'Sharing stopped'}
            </div>
          </div>
          {id && <span className="t-mono" style={{ marginLeft: 'auto', fontSize: 10, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis' }}>#{id}</span>}
        </div>

        {/* Map */}
        <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
          <MapContainer
            center={center}
            zoom={15}
            style={{ width: '100%', height: '100%' }}
            zoomControl={false}
            attributionControl={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="© OpenStreetMap contributors"
            />
            <MapUpdater center={center} />

            {/* My position */}
            <Marker position={ME_POS} icon={makeIcon('🧍', 36)} />

            {/* Partner position */}
            {sharing && (
              <>
                <Marker position={PARTNER_POS} icon={makeIcon('👩🏾', 36)} />
                {precision === 'block' ? (
                  <Circle
                    center={PARTNER_POS}
                    radius={200}
                    pathOptions={{ color: '#38BDF8', fillColor: '#38BDF8', fillOpacity: 0.12, weight: 1.5 }}
                  />
                ) : null}
              </>
            )}
          </MapContainer>

          {/* Legend overlay */}
          <div style={{
            position: 'absolute', top: 10, right: 10, zIndex: 1000,
            background: 'rgba(14,23,32,0.85)', borderRadius: 'var(--r-md)', padding: '8px 12px',
            backdropFilter: 'blur(8px)', border: '1px solid rgba(56,189,248,0.2)',
          }}>
            <div style={{ fontSize: 11, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>🧍</span><span style={{ color: 'var(--ink2)' }}>You</span>
            </div>
            <div style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>👩🏾</span><span style={{ color: 'var(--ink2)' }}>{PARTNER_NAME}</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div style={{ padding: '14px 20px', flexShrink: 0, background: 'var(--bg1)', borderTop: '1px solid var(--border)' }}>
          {/* Precision toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Location precision</div>
              <p className="t-small">{precision === 'exact' ? 'Exact GPS — partner sees pin' : 'Block-level — approx. 200m radius'}</p>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {['exact', 'block'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPrecision(p)}
                  style={{
                    padding: '5px 10px', borderRadius: 'var(--r-full)', fontSize: 11, fontWeight: 700,
                    cursor: 'pointer', border: '1px solid',
                    background: precision === p ? 'var(--accent)' : 'transparent',
                    color: precision === p ? 'var(--navy-900)' : 'var(--ink2)',
                    borderColor: precision === p ? 'var(--accent)' : 'var(--border2)',
                  }}
                >
                  {p === 'exact' ? 'Exact' : 'Block'}
                </button>
              ))}
            </div>
          </div>

          {sharing ? (
            <button
              className="btn btn-danger btn-sm"
              onClick={() => setSharing(false)}
            >
              🛑 Stop sharing
            </button>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '10px' }}>
              <p className="t-body" style={{ fontSize: 13 }}>Location sharing stopped. Consent record updated.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
