import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api.js';
import { StatusBar } from '../../components/layout/StatusBar.jsx';
export function GuardianScreen() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  useEffect(()=>{ api.get('/guardian/contacts').then(setContacts).catch(()=>{}); },[]);
  async function alert(type) {
    try { await api.post('/alerts/guardian',{type,lat:null,lng:null}); alert('Alert sent!'); } catch(e){ alert(e.message); }
  }
  return (
    <div className='phone-inner'><StatusBar />
      <div className='screen' style={{padding:'24px'}}>
        <div className='t-h2' style={{marginBottom:16}}>🛡 Trusted Circle</div>
        <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:24}}>
          {[['🤫','Silent Check-In','silent_checkin'],['🚗','Come Get Me','come_get_me'],['🚨','Emergency','emergency']].map(([icon,label,type])=>(
            <button key={type} className='btn btn-ghost' onClick={()=>alert(type)}>{icon} {label}</button>
          ))}
        </div>
        {contacts.length===0 && <p className='t-body'>No contacts yet. Add someone you trust.</p>}
        {contacts.map(c=><div key={c.id} className='card' style={{marginBottom:8}}><div style={{fontWeight:700}}>{c.name}</div><p className='t-small'>{c.phone}</p></div>)}
        <button className='btn btn-ghost' style={{marginTop:16}} onClick={()=>navigate(-1)}>Back</button>
      </div>
    </div>
  );
}