import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { StatusBar } from '../../components/layout/StatusBar.jsx';
import { PinPad } from '../../components/consent/PinPad.jsx';
import { consentService } from '../../services/consent.js';
export function RevokeScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState('warn');
  const [reason, setReason] = useState('');
  async function handlePIN(pin, reset, setErr) {
    try { await consentService.revoke(id, { pin, reason }); setStep('done'); }
    catch(e) { reset(); setErr(e.message); }
  }
  return (
    <div className='phone-inner'><StatusBar />
      <div className='screen' style={{padding:'24px'}}>
        {step==='warn' && <>
          <div className='t-h2' style={{marginBottom:8,color:'var(--red)'}}>⚠️ I've Changed My Mind</div>
          <p className='t-body' style={{marginBottom:16}}>Revoking consent creates a permanent record. Your partner will be notified.</p>
          <p className='t-label' style={{marginBottom:8}}>Reason (optional, not shared)</p>
          <input className='input-field' placeholder='Your reason...' value={reason} onChange={e=>setReason(e.target.value)} style={{marginBottom:20}} />
          <button className='btn btn-danger' onClick={()=>setStep('pin')}>Continue to revoke</button>
          <button className='btn btn-ghost' style={{marginTop:10}} onClick={()=>navigate(-1)}>Cancel</button>
        </>}
        {step==='pin' && <PinPad onComplete={handlePIN} label='Enter your PIN to confirm revocation' />}
        {step==='done' && <div style={{textAlign:'center',paddingTop:40}}>
          <div style={{fontSize:48,marginBottom:16}}>🔴</div>
          <div className='t-h2' style={{marginBottom:8}}>Consent Revoked</div>
          <p className='t-body' style={{marginBottom:24}}>A permanent record has been created. Your partner has been notified.</p>
          <button className='btn btn-primary' onClick={()=>navigate('/home')}>Done</button>
        </div>}
      </div>
    </div>
  );
}