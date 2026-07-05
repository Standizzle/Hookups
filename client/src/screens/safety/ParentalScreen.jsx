import { useNavigate } from 'react-router-dom';
import { StatusBar } from '../../components/layout/StatusBar.jsx';
export function ParentalScreen() {
  const navigate = useNavigate();
  return (
    <div className='phone-inner'><StatusBar />
      <div className='screen' style={{padding:'24px'}}>
        <div className='t-h2' style={{marginBottom:12}}>👨‍👩‍👧 Parental Controls</div>
        <p className='t-body' style={{marginBottom:24}}>Link a parent or guardian to your account.</p>
        <button className='btn btn-primary' onClick={()=>{}}>Send parent link request</button>
        <button className='btn btn-ghost' style={{marginTop:10}} onClick={()=>navigate(-1)}>Back</button>
      </div>
    </div>
  );
}