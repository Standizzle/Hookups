import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { StatusBar } from '../../components/layout/StatusBar.jsx';
import { locationService } from '../../services/location.js';
import { useAuth } from '../../context/AuthContext.jsx';

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

// Fallback center (Cape Town) used only until we get a real GPS fix
const FALLBACK_CENTER = [-33.9249, 18.4241];
const PING_INTERVAL_MS = 4000;

function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => { map.setView(center, map.getZoom(), { animate: true }); }, [center, map]);
  return null;
}

export function LiveMapScreen() {
  const navigate = useNavigate();
  const { id: recordId } = useParams();
  const routerLocation = useLocation();
  const { user } = useAuth();
  const partnerName = routerLocation.state?.partnerName ?? 'Partner';

  const [precision, setPrecision] = useState('exact'); // exact | block
  const [sharing, setSharing] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [myPos, setMyPos] = useState(null);
  const [partnerPos, setPartnerPos] = useState(null);
  const [error, setError] = useState('');

  const lastPingRef = useRef(0);
  const watchIdRef = useRef(null);
  const socketRef = useRef(null);

  // Start sharing + geolocation watch
  useEffect(() => {
    let cancelled = false;

    locationService.start(recordId, precision).catch((err) => setError(err.message));

    locationService.getPartner(recordId)
      .then((data) => {
        if (!cancelled && data.sharing && data.lat != null && data.lng != null) setPartnerPos([data.lat, data.lng]);
      })
      .catch(() => {});

    if (!navigator.geolocation) {
      setError('Geolocation is not available in this browser.');
    } else {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          setMyPos([latitude, longitude]);
          const now = Date.now();
          if (now - lastPingRef.current > PING_INTERVAL_MS) {
            lastPingRef.current = now;
            locationService.ping(recordId, { lat: latitude, lng: longitude, accuracy }).catch(() => {});
          }
        },
        (err) => setError(err.message ?? 'Could not get your location'),
        { enableHighAccuracy: true, maximumAge: 5000 }
      );
    }

    // Socket.io: join room for real-time partner updates
    const socket = io({ path: '/socket.io' });
    socketRef.current = socket;
    socket.emit('join:consent', { recordId });
    socket.on('location:update', (msg) => {
      if (msg.userId === user?.id) return; // ignore our own echo
      if (msg.stopped) { setPartnerPos(null); return; }
      if (msg.lat == null || msg.lng == null) return;
      setPartnerPos([msg.lat, msg.lng]);
    });

    return () => {
      cancelled = true;
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
      socket.emit('leave:consent', { recordId });
      socket.disconnect();
    };
  }, [recordId]);

  useEffect(() => {
    if (!sharing) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [sharing]);

  async function stopSharing() {
    setSharing(false);
    if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
    try { await locationService.stop(recordId); } catch (err) { setError(err.message); }
  }

  async function changePrecision(p) {
    setPrecision(p);
    try { await locationService.start(recordId, p); } catch (err) { setError(err.message); }
  }

  function formatTime(s) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${ss}s`;
    return `${ss}s`;
  }

  const center = myPos ?? partnerPos ?? FALLBACK_CENTER;

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
          {recordId && <span className="t-mono" style={{ marginLeft: 'auto', fontSize: 10, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis' }}>#{recordId}</span>}
        </div>

        {error && <p style={{ color: 'var(--red)', fontSize: 12, padding: '0 20px 8px' }}>{error}</p>}

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

            {myPos && <Marker position={myPos} icon={makeIcon('🧍', 36)} />}

            {sharing && partnerPos && (
              <>
                <Marker position={partnerPos} icon={makeIcon('📍', 36)} />
                {precision === 'block' ? (
                  <Circle
                    center={partnerPos}
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
              <span>📍</span><span style={{ color: 'var(--ink2)' }}>
                {partnerPos ? partnerName : `Waiting for ${partnerName}…`}
              </span>
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
                  onClick={() => changePrecision(p)}
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
            <button className="btn btn-danger btn-sm" onClick={stopSharing}>
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
