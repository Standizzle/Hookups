import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';
import { StatusBar } from '../components/layout/StatusBar.jsx';
import { NavBar } from '../components/layout/NavBar.jsx';

export function LogsScreen() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const nav = (i) => navigate(['/home','/consent','/logs','/profile'][i]);
  useEffect(() => { api.get('/users/me/logs').then(d => setLogs(d.logs ?? [])).catch(()=>{}); }, []);
  return (
    <div className='phone-inner'>
      <StatusBar />
      <div className='screen' style={{ padding:'24px' }}>
        <div className='t-h2' style={{ marginBottom:16 }}>Activity Logs</div>
        {logs.length === 0 && <p className='t-body'>No activity yet. Complete your first consent to see it here.</p>}
        {logs.map(l=>(
          <div key={l.id} className='card' style={{ marginBottom:10 }}>
            <div style={{ fontWeight:700, fontSize:14 }}>{l.title}</div>
            <p className='t-small'>{new Date(l.createdAt).toLocaleString()}</p>
          </div>
        ))}
      </div>
      <NavBar active={2} onTab={nav} />
    </div>
  );
}