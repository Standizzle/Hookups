import { useNavigate } from 'react-router-dom';
import { StatusBar } from '../components/layout/StatusBar.jsx';
export function NotificationsScreen() {
  const navigate = useNavigate();
  return (
    <div className='phone-inner'><StatusBar />
      <div className='screen' style={{padding:'24px'}}>
        <div className='t-h2' style={{marginBottom:16}}>Notifications</div>
        <p className='t-body'>No new notifications.</p>
        <button className='btn btn-ghost' style={{marginTop:20}} onClick={()=>navigate('/home')}>Back</button>
      </div>
    </div>
  );
}