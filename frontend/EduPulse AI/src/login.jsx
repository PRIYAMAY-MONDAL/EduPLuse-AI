import { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw, Volume2, KeyRound, Mail, User, ShieldCheck } from 'lucide-react';

export default function Login({ onAuthSuccess }) {
  // Modes: 'login' | 'register' | 'forgot'
  const [authMode, setAuthMode] = useState('login');
  
  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [degree, setDegree] = useState('');

  // CAPTCHA States
  const [captchaCode, setCaptchaCode] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaError, setCaptchaError] = useState(false);
  const canvasRef = useRef(null);

  const generateCaptchaText = useCallback(() => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaCode(result);
    setCaptchaInput('');
    setCaptchaError(false);
  }, []);

  const drawVisualCaptcha = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !captchaCode) return;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#111827'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = `rgba(${Math.floor(Math.random() * 100 + 100)}, ${Math.floor(Math.random() * 100 + 100)}, 255, 0.25)`;
      ctx.lineWidth = Math.random() * 2 + 1;
      ctx.beginPath();
      ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.stroke();
    }

    ctx.font = 'bold 26px monospace';
    ctx.textBaseline = 'middle';
    
    for (let i = 0; i < captchaCode.length; i++) {
      const char = captchaCode[i];
      ctx.fillStyle = ['#6366f1', '#a78bfa', '#f59e0b', '#10b981'][i % 4];
      
      ctx.save();
      const xPos = 20 + i * 26;
      const yPos = canvas.height / 2 + (Math.random() * 10 - 5);
      ctx.translate(xPos, yPos);
      
      const angle = (Math.random() * 30 - 15) * Math.PI / 180;
      ctx.rotate(angle);
      
      ctx.fillText(char, 0, 0);
      ctx.restore();
    }

    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.beginPath();
      ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, Math.random() * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [captchaCode]);

  useEffect(() => {
    drawVisualCaptcha();
  }, [drawVisualCaptcha]);

  useEffect(() => {
    generateCaptchaText();
  }, [generateCaptchaText, authMode]);

  const triggerAudioCaptchaSpeech = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!captchaCode || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel(); 
    const spelledOutText = captchaCode.split('').join('. . ');
    const utterance = new SpeechSynthesisUtterance(
      `Security verification. Type these characters. ${spelledOutText}`
    );
    utterance.rate = 0.65; 
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();

    if (captchaInput.trim().toLowerCase() !== captchaCode.toLowerCase()) {
      setCaptchaError(true);
      generateCaptchaText(); 
      return;
    }

    if (authMode === 'login') {
      try {
        const response = await fetch('http://127.0.0.1:8000/api/auth/login/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (response.ok && data.user) {
          onAuthSuccess(data.user);
        } else {
          alert(data.error || 'Authentication credentials invalid.');
        }
      } catch {
        alert('Network Disruption: Unable to link to your Django core server.');
      }
    } else if (authMode === 'register') {
      try {
        const response = await fetch('http://127.0.0.1:8000/api/auth/register/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, course: degree })
        });
        const data = await response.json();
        if (response.ok) {
          alert('Registration successful! Redirecting to credentials portal console.');
          setAuthMode('login');
        } else {
          alert(data.error || 'Registration fields rejected.');
        }
      } catch {
        alert('Django server offline.');
      }
    } else if (authMode === 'forgot') {
      try {
        const response = await fetch('http://127.0.0.1:8000/api/auth/forgot-password/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await response.json();
        if (response.ok) {
          alert(`🔒 Password reset tunnel provisioned! If an active profile exists for "${email}", a reset sequence has been dispatched.`);
          setAuthMode('login');
        } else {
          alert(data.error || 'Failed processing request parameters.');
        }
      } catch {
        alert('Network fault dispatching credentials resets.');
      }
    }
  };

  return (
    <div className="auth-overlay">
      <div className="auth-card" style={{ maxWidth: '460px' }}>
        <div className="auth-logo">EduPulse <span>AI</span></div>
        
        {authMode !== 'forgot' && (
          <div className="auth-tabs">
            <button type="button" className={`auth-tab-btn ${authMode === 'login' ? 'active' : ''}`} onClick={() => setAuthMode('login')}>Sign In</button>
            <button type="button" className={`auth-tab-btn ${authMode === 'register' ? 'active' : ''}`} onClick={() => setAuthMode('register')}>Create Account</button>
          </div>
        )}

        {authMode === 'forgot' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--warning)', fontSize: '0.9rem', marginBottom: '1.25rem', fontWeight: '600' }}>
            <KeyRound size={16} /> Password Account Recovery
          </div>
        )}

        <form onSubmit={handleAuthSubmit}>
          {authMode === 'register' && (
            <div className="input-group">
              <label><User size={12} style={{ marginRight: '4px' }} /> Full Name</label>
              <input type="text" required placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} />
            </div>
          )}

          <div className="input-group">
            <label><Mail size={12} style={{ marginRight: '4px' }} /> Email Address</label>
            <input type="email" required placeholder="student@university.edu" value={email} onChange={e => setEmail(e.target.value)} />
          </div>

          {authMode !== 'forgot' && (
            <div className="input-group">
              <label><KeyRound size={12} style={{ marginRight: '4px' }} /> Account Password</label>
              <input type="password" required placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
          )}

          {authMode === 'register' && (
            <div className="input-group">
              <label>Course Degree Criteria</label>
              <input 
                type="text" 
                required 
                placeholder="e.g. B.Tech Computer Science" 
                value={degree} 
                onChange={e => setDegree(e.target.value)} 
              />
            </div>
          )}

          <div className="card" style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-strong)', marginBottom: '1.25rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em', fontWeight: '700', marginBottom: '0.5rem' }}>
              <ShieldCheck size={14} style={{ color: 'var(--accent)' }} /> Security Verification
            </label>
            
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem' }}>
              <canvas ref={canvasRef} width="180" height="46" style={{ borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: '#111827' }} />
              
              <button type="button" onClick={triggerAudioCaptchaSpeech} className="icon-btn" style={{ minWidth: '38px', minHeight: '38px', backgroundColor: 'var(--bg-tertiary)' }} title="Listen to Audio Code Sequence">
                <Volume2 size={16} style={{ color: 'var(--accent)' }} />
              </button>
              
              <button type="button" onClick={generateCaptchaText} className="icon-btn" style={{ minWidth: '38px', minHeight: '38px', backgroundColor: 'var(--bg-tertiary)' }} title="Reload Security Pattern">
                <RefreshCw size={14} />
              </button>
            </div>

            <input 
              type="text" 
              required
              placeholder="Enter verification code"
              value={captchaInput}
              onChange={e => setCaptchaInput(e.target.value)}
              style={{
                width: '100%', padding: '0.55rem 0.75rem', background: 'var(--bg-secondary)', 
                border: captchaError ? '1px solid var(--danger)' : '1px solid var(--border-strong)',
                color: 'white', borderRadius: 'var(--radius-sm)', fontSize: '0.88rem', fontFamily: 'monospace'
              }}
            />
            {captchaError && (
              <span style={{ fontSize: '0.72rem', color: 'var(--danger)', marginTop: '4px', display: 'block' }}>
                ⚠️ Security verification mismatch. Code replaced.
              </span>
            )}
          </div>

          <button type="submit" className="btn btn-primary btn-block">
            {authMode === 'login' ? 'Secure Login Session' : authMode === 'register' ? 'Register Account Core' : 'Dispatch Recovery Links'}
          </button>

          <div className="auth-footer">
            {authMode === 'login' && (
              <span onClick={() => setAuthMode('forgot')} style={{ color: 'var(--accent)', cursor: 'pointer' }}>
                Forgot your account password? Recover path
              </span>
            )}
            {authMode !== 'login' && (
              <span onClick={() => setAuthMode('login')} style={{ color: 'var(--text-muted)', cursor: 'pointer' }}>
                Return to standard <strong style={{ color: 'var(--accent)' }}>Sign In Panel</strong>
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}