import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { StatusBar } from '../../components/layout/StatusBar.jsx';
import { NavBar } from '../../components/layout/NavBar.jsx';
export function ProfileScreen() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const nav = (i) => navigate(['/home','/consent','/logs','/profile'][i]);
  return (
    <div className='phone-inner'><StatusBar />
      <div className='screen' style={{padding:'24px'}}>
        <div style={{textAlign:'center',marginBottom:24}}>
          <div style={{width:72,height:72,borderRadius:'50%',background:'var(--accent-bg)',border:'2px solid var(--accent)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,margin:'0 auto 12px'}}>👤</div>
          <div className='t-h2'>{user?.fullName}</div>
          <p className='t-small'>{user?.phone}</p>
        </div>
        {[['🛡','Guardian','/guardian'],['🔐','Duress PIN','/duress'],['👨‍👩‍👧','Parental Controls','/parental'],['🔔','Notifications','/notifs']].map(([icon,label,path])=>(
          <button key={path} className='card' style={{display:'flex',alignItems:'center',gap:12,cursor:'pointer',marginBottom:10,width:'100%'}} onClick={()=>navigate(path)}>
            <span style={{fontSize:22}}>{icon}</span><span style={{fontWeight:700}}>{label}</span>
          </button>
        ))}
      </div>
      <NavBar active={3} onTab={nav} />
    </div>
  );
}