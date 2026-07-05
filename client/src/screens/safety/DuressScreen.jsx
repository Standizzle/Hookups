import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBar } from '../../components/layout/StatusBar.jsx';
import { PinPad } from '../../components/consent/PinPad.jsx';
import { authService } from '../../services/auth.js';
export function DuressScreen() {
  const navigate = useNavigate();
  const [step, setStep] = useState('intro');
  const [pin, setPin] = useState('');
  async function handleSet(value, reset, setErr) {
    if (!pin) { setPin(value); setStep('confirm'); return; }
    try { await authService.setPIN({ pin, duressPin: value }); setStep('done'); }
    catch(e) { reset(); setErr(e.message); }
  }
  return (
    <div className='phone-inner'><StatusBar />
      <div className='screen' style={{padding:'24px'}}>
        {step==='intro' && <>
          <div className='t-h2' style={{marginBottom:8}}>🆘 Duress PIN</div>
          <p className='t-body' style={{marginBottom:16}}>A secret PIN that looks exactly like a normal login — but silently alerts your trusted circle with your location.</p>
          <button className='btn btn-primary' onClick={()=>setStep('set')}>Set up Duress PIN</button>
          <button className='btn btn-ghost' style={{marginTop:10}} onClick={()=>navigate(-1)}>Back</button>
        </>}
        {step==='set' && <PinPad onComplete={handleSet} label='Choose duress PIN' />}
        {step==='confirm' && <PinPad onComplete={handleSet} label='Confirm duress PIN' />}
        {step==='done' && <>
          <div style={{textAlign:'center',paddingTop:40}}>
            <div style={{fontSize:48,marginBottom:16}}>✅</div>
            <div className='t-h2' style={{marginBottom:8}}>Duress PIN set</div>
            <p className='t-body' style={{marginBottom:24}}>Enter it anywhere a PIN is expected to silently alert your trusted circle.</p>
            <button className='btn btn-primary' onClick={()=>navigate(-1)}>Done</button>
          </div>
        </>}
      </div>
    </div>
  );
}