import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { User, Mail, Lock, Phone, AlertCircle, X } from 'lucide-react';

export const Register: React.FC = () => {
  const { loginWithGoogle } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload = {
      username,
      email,
      password,
      first_name: firstName,
      last_name: lastName,
      phone_number: phoneNumber,
      role: 'user'
    };

    try {
      await api.post('/register/', payload);
      // Redirect to login upon successful registration
      navigate('/login', { state: { message: "Account created successfully! Please log in." } });
    } catch (err: any) {
      console.error(err);
      if (err.response?.data) {
        const errorDetails = Object.entries(err.response.data)
          .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
          .join(' | ');
        setError(errorDetails || "Failed to create account. Please double-check details.");
      } else {
        setError("Network error. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async (email: string, firstName: string, lastName: string) => {
    setError(null);
    setLoading(true);
    setShowGoogleModal(false);
    try {
      await loginWithGoogle(email, firstName, lastName);
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to authenticate via Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6 relative overflow-hidden font-sans">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/10 rounded-full blur-3xl -z-10"></div>

      <div className="w-full max-w-xl bg-card border border-border rounded-2xl shadow-xl overflow-hidden p-8 sm:p-10 my-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold tracking-tight">Create an Account</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Join the carpooling community
          </p>
        </div>

        {/* Error notification banner */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg p-4 mb-6 flex items-start space-x-3">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Register form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                First Name
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. John"
                className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-2.5 text-sm transition-all outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Last Name
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Doe"
                className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-2.5 text-sm transition-all outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Username
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-muted-foreground">
                  <User size={16} />
                </span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="john_doe"
                  className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl pl-9 pr-4 py-2.5 text-sm transition-all outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Phone Number
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-muted-foreground">
                  <Phone size={16} />
                </span>
                <input
                  type="text"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+15550101"
                  className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl pl-9 pr-4 py-2.5 text-sm transition-all outline-none"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-muted-foreground">
                <Mail size={16} />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl pl-9 pr-4 py-2.5 text-sm transition-all outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-muted-foreground">
                <Lock size={16} />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl pl-9 pr-4 py-2.5 text-sm transition-all outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-xl transition-all shadow-md shadow-primary/20 hover:shadow-primary/30 flex items-center justify-center space-x-2 mt-6"
          >
            {loading ? (
              <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground"></span>
            ) : (
              <span>Create Account</span>
            )}
          </button>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-border"></div>
            <span className="flex-shrink mx-4 text-xs text-muted-foreground uppercase">or</span>
            <div className="flex-grow border-t border-border"></div>
          </div>

          <button
            type="button"
            onClick={() => setShowGoogleModal(true)}
            className="w-full py-3 px-4 bg-card hover:bg-muted/40 border border-border text-foreground font-semibold rounded-xl transition-all flex items-center justify-center space-x-2"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
            </svg>
            <span>Continue with Google</span>
          </button>
        </form>

        {/* Footer */}
        <div className="text-center mt-8 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline font-semibold">
              Sign In
            </Link>
          </p>
        </div>
      </div>

      {/* Google Sign-In Mock Modal */}
      {showGoogleModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-card border border-border w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-6 relative">
            <button
              onClick={() => setShowGoogleModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors outline-none"
            >
              <X size={18} />
            </button>
            <div className="text-center space-y-2">
              <div className="flex justify-center">
                <svg className="h-8 w-8" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
              </div>
              <h3 className="font-bold text-lg tracking-tight">Sign in with Google</h3>
              <p className="text-xs text-muted-foreground">Choose an account to continue to Carpool App</p>
            </div>

            <div className="space-y-3">
              {[
                { name: 'Alex Green', email: 'alex.green@gmail.com' },
                { name: 'Sarah Lee', email: 'sarah.lee@gmail.com' }
              ].map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleGoogleLogin(acc.email, acc.name.split(' ')[0], acc.name.split(' ')[1])}
                  className="w-full p-3 rounded-xl border border-border hover:bg-muted/30 transition-all text-left flex items-center space-x-3 outline-none"
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                    {acc.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate leading-none mb-1">{acc.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{acc.email}</p>
                  </div>
                </button>
              ))}

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-border/60"></div>
                <span className="flex-shrink mx-3 text-[10px] text-muted-foreground uppercase">or use custom</span>
                <div className="flex-grow border-t border-border/60"></div>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const email = formData.get('email') as string;
                const firstName = formData.get('firstName') as string || 'Google';
                const lastName = formData.get('lastName') as string || 'User';
                if (email) handleGoogleLogin(email, firstName, lastName);
              }} className="space-y-2.5">
                <input
                  type="email"
                  name="email"
                  placeholder="name@gmail.com"
                  required
                  className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-3 py-2 text-xs transition-all outline-none"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    name="firstName"
                    placeholder="First Name"
                    className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-3 py-2 text-xs transition-all outline-none"
                  />
                  <input
                    type="text"
                    name="lastName"
                    placeholder="Last Name"
                    className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-3 py-2 text-xs transition-all outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-xl text-xs transition-all flex items-center justify-center outline-none"
                >
                  Continue
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
