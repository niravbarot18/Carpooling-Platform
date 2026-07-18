import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, UserPlus, AlertCircle, CheckCircle, Car, Leaf, TrendingDown, Users } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [employeeId, setEmployeeId] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isRegister) {
        if (!email.includes('@')) {
          setError('Please provide a valid corporate email address.');
          setLoading(false);
          return;
        }
        await register({
          email,
          username: email.split('@')[0],
          password,
          first_name: firstName,
          last_name: lastName,
          phone,
          department,
          employee_id: employeeId,
        });
        setSuccess('Registration successful! You can now sign in.');
        setIsRegister(false);
        setPassword('');
      } else {
        await login(email, password);
        navigate('/');
      }
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.detail ||
        err.response?.data?.non_field_errors?.[0] ||
        'Authentication failed. Please verify your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Car,        label: 'Smart Ride Matching',    desc: 'AI-powered route overlap detection' },
    { icon: Leaf,       label: 'Carbon Tracking',        desc: 'Real-time CO₂ savings per trip' },
    { icon: TrendingDown, label: 'Cost Reduction',       desc: 'Save up to 60% on daily commutes' },
    { icon: Users,      label: 'Team Carpooling',        desc: 'Connect with colleagues nearby' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      {/* ── Left panel: branding ── */}
      <div
        style={{
          flex: '0 0 45%',
          background: 'linear-gradient(135deg, #064e3b 0%, #065f46 40%, #047857 100%)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '60px 56px',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* subtle decorative circles */}
        <div style={{
          position: 'absolute', top: -80, right: -80,
          width: 320, height: 320, borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)',
        }} />
        <div style={{
          position: 'absolute', bottom: -60, left: -60,
          width: 240, height: 240, borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)',
        }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 700,
            backdropFilter: 'blur(8px)',
          }}>
            C
          </div>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.3px' }}>
            Enterprise Carpooling
          </span>
        </div>

        <h1 style={{ fontSize: 36, fontWeight: 800, lineHeight: 1.2, marginBottom: 16, letterSpacing: '-0.5px' }}>
          Smarter commutes.<br />Greener planet.
        </h1>
        <p style={{ fontSize: 15, opacity: 0.75, lineHeight: 1.7, marginBottom: 48, maxWidth: 360 }}>
          Connect with colleagues heading the same direction, reduce costs, and track your environmental impact — all in one platform.
        </p>

        {/* Feature list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {features.map(({ icon: Icon, label, desc }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: 'rgba(255,255,255,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Icon size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{label}</div>
                <div style={{ fontSize: 12, opacity: 0.65, marginTop: 2 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel: form ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 32px',
        background: '#f9fafb',
        overflowY: 'auto',
      }}>
        <div style={{
          width: '100%',
          maxWidth: 440,
          background: 'white',
          borderRadius: 20,
          border: '1px solid #f0f0f0',
          boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
          padding: '40px 36px',
        }}>
          {/* Form header */}
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>
              {isRegister ? 'Create your account' : 'Welcome back'}
            </h2>
            <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 6 }}>
              {isRegister
                ? 'Register using your corporate email'
                : 'Sign in using your corporate credentials'}
            </p>
          </div>

          {/* Alerts */}
          {error && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 12, padding: '12px 14px', marginBottom: 20,
              color: '#dc2626', fontSize: 13,
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              background: '#f0fdf4', border: '1px solid #bbf7d0',
              borderRadius: 12, padding: '12px 14px', marginBottom: 20,
              color: '#16a34a', fontSize: 13,
            }}>
              <CheckCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{success}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {isRegister && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>First Name</label>
                  <input
                    type="text" required placeholder="John"
                    value={firstName} onChange={e => setFirstName(e.target.value)}
                    style={inputStyle}
                    onFocus={e => Object.assign(e.target.style, inputFocusStyle)}
                    onBlur={e => Object.assign(e.target.style, inputStyle)}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Last Name</label>
                  <input
                    type="text" required placeholder="Doe"
                    value={lastName} onChange={e => setLastName(e.target.value)}
                    style={inputStyle}
                    onFocus={e => Object.assign(e.target.style, inputFocusStyle)}
                    onBlur={e => Object.assign(e.target.style, inputStyle)}
                  />
                </div>
              </div>
            )}

            <div>
              <label style={labelStyle}>Email Address</label>
              <input
                type="email" required placeholder="employee@company.com"
                value={email} onChange={e => setEmail(e.target.value)}
                style={inputStyle}
                onFocus={e => Object.assign(e.target.style, inputFocusStyle)}
                onBlur={e => Object.assign(e.target.style, inputStyle)}
              />
            </div>

            {isRegister && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Employee ID</label>
                  <input
                    type="text" required placeholder="EMP1234"
                    value={employeeId} onChange={e => setEmployeeId(e.target.value)}
                    style={inputStyle}
                    onFocus={e => Object.assign(e.target.style, inputFocusStyle)}
                    onBlur={e => Object.assign(e.target.style, inputStyle)}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Department</label>
                  <select
                    value={department} onChange={e => setDepartment(e.target.value)}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    {['Engineering','Product','Sales','Marketing','Operations','Finance','HR'].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {isRegister && (
              <div>
                <label style={labelStyle}>Phone Number</label>
                <input
                  type="tel" placeholder="+91 98765 43210"
                  value={phone} onChange={e => setPhone(e.target.value)}
                  style={inputStyle}
                  onFocus={e => Object.assign(e.target.style, inputFocusStyle)}
                  onBlur={e => Object.assign(e.target.style, inputStyle)}
                />
              </div>
            )}

            <div>
              <label style={labelStyle}>Password</label>
              <input
                type="password" required placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)}
                style={inputStyle}
                onFocus={e => Object.assign(e.target.style, inputFocusStyle)}
                onBlur={e => Object.assign(e.target.style, inputStyle)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 8,
                height: 46,
                background: loading ? '#6ee7b7' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                fontWeight: 600,
                fontSize: 15,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
                width: '100%',
              }}
              onMouseEnter={e => { if (!loading) (e.target as HTMLElement).style.background = '#059669'; }}
              onMouseLeave={e => { if (!loading) (e.target as HTMLElement).style.background = '#10b981'; }}
            >
              {loading ? (
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  border: '2.5px solid rgba(255,255,255,0.4)',
                  borderTopColor: 'white',
                  animation: 'spin 0.7s linear infinite',
                }} />
              ) : isRegister ? (
                <><UserPlus size={17} /><span>Register Account</span></>
              ) : (
                <><LogIn size={17} /><span>Sign In</span></>
              )}
            </button>
          </form>

          {/* Toggle */}
          <p style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: '#6b7280' }}>
            {isRegister ? 'Already have an account? ' : 'New to the platform? '}
            <button
              onClick={() => { setIsRegister(!isRegister); setError(''); setSuccess(''); }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#10b981', fontWeight: 600, fontSize: 13,
                textDecoration: 'underline', padding: 0,
              }}
            >
              {isRegister ? 'Sign In' : 'Register Employee'}
            </button>
          </p>
        </div>

        {/* Demo credentials hint */}
        <div style={{
          marginTop: 20, padding: '12px 20px',
          background: '#f0fdf4', border: '1px solid #bbf7d0',
          borderRadius: 12, fontSize: 12, color: '#065f46',
          textAlign: 'center', maxWidth: 440, width: '100%',
        }}>
          <strong>Demo:</strong> rohan.sharma@enterprise.com · password123
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

// Inline style objects
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: '#6b7280',
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 44,
  border: '1px solid #e5e7eb',
  borderRadius: 10,
  padding: '0 14px',
  fontSize: 14,
  color: '#111827',
  background: 'white',
  outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
  boxSizing: 'border-box',
};

const inputFocusStyle: React.CSSProperties = {
  ...inputStyle,
  borderColor: '#10b981',
  boxShadow: '0 0 0 3px rgba(16,185,129,0.12)',
};
