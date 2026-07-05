import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { StatusBar } from '../components/layout/StatusBar.jsx';
import { NavBar } from '../components/layout/NavBar.jsx';

export function HomeScreen() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const nav = (i) => ['/home','/consent','/logs','/profile'][i] && navigate(['/home','/consent','/logs','/profile'][i]);
  return (
    <div className='phone-inner'>
      <StatusBar />
      <div className='screen' style={{ padding: '24px' }}>
        <div className='t-h2' style={{ marginBottom: 4 }}>Hey {user?.fullName?.split(' ')[0] ?? 'there'} 👋</div>
        <p className='t-body' style={{ marginBottom: 24 }}>Safety. Always.</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          {[['✅','New Consent','/consent'],['👥','Partners','/profile'],['🛡','Guardian','/guardian'],['👨‍👩‍👧','Parental','/parental']].map(([icon,label,path])=>(
            <button key={path} className='card' style={{ cursor:'pointer', textAlign:'center', paddingTop:20, paddingBottom:20 }} onClick={()=>navigate(path)}>
              <div style={{ fontSize:28, marginBottom:6 }}>{icon}</div>
              <div style={{ fontSize:13, fontWeight:700 }}>{label}</div>
            </button>
          ))}
        </div>
        <button className='btn btn-ghost' onClick={logout}>Sign out</button>
      </div>
      <NavBar active={0} onTab={nav} />
    </div>
  );
}