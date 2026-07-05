import { useNavigate } from 'react-router-dom';
import { StatusBar } from '../../components/layout/StatusBar.jsx';
export function LiveMapScreen() {
  const navigate = useNavigate();
  return (
    <div className='phone-inner'><StatusBar />
      <div className='screen' style={{padding:'24px'}}>
        <div className='t-h2' style={{marginBottom:12}}>📍 Live Map</div>
        <div style={{background:'var(--bg2)',borderRadius:'var(--r-md)',height:240,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:16,border:'1px solid var(--border)'}}>
          <p className='t-body'>Map renders here (integrate Leaflet/Mapbox)</p>
        </div>
        <button className='btn btn-ghost' onClick={()=>navigate(-1)}>Back</button>
      </div>
    </div>
  );
}