import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBar } from '../../components/layout/StatusBar.jsx';
import { parentalService } from '../../services/parental.js';

export function ParentalScreen() {
  const navigate = useNavigate();
  const [minorPhone, setMinorPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function sendLinkRequest() {
    setLoading(true);
    setError('');
    try {
      await parentalService.link(minorPhone.trim());
      setSent(true);
    } catch (err) {
      setError(err.message ?? 'Could not send link request');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className='phone-inner'><StatusBar />
      <div className='screen' style={{padding:'24px'}}>
        <div className='t-h2' style={{marginBottom:12}}>👨‍👩‍👧 Parental Controls</div>

        {sent ? (
          <>
            <p className='t-body' style={{marginBottom:24}}>
              Link request sent to <strong style={{color:'var(--ink)'}}>{minorPhone}</strong>. They'll need to accept it from their account.
            </p>
            <button className='btn btn-ghost' onClick={()=>navigate(-1)}>Back</button>
          </>
        ) : (
          <>
            <p className='t-body' style={{marginBottom:20}}>
              As a parent or guardian, link your teen's account by entering their mobile number below.
            </p>
            <input
              className='input-field'
              type='tel'
              placeholder="Teen's mobile number (+27…)"
              value={minorPhone}
              onChange={(e) => setMinorPhone(e.target.value)}
              style={{marginBottom:12}}
            />
            {error && <p style={{color:'var(--red)',fontSize:13,marginBottom:12}}>{error}</p>}
            <button className='btn btn-primary' onClick={sendLinkRequest} disabled={!minorPhone.trim() || loading}>
              {loading ? 'Sending…' : 'Send parent link request'}
            </button>
            <button className='btn btn-ghost' style={{marginTop:10}} onClick={()=>navigate(-1)}>Back</button>
          </>
        )}
      </div>
    </div>
  );
}
