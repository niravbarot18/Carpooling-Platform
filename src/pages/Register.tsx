import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { User, Mail, Lock, Building, Phone, AlertCircle, ShieldAlert } from 'lucide-react';

interface Organization {
  id: number;
  name: string;
  domain: string;
}

export const Register: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [role, setRole] = useState<'employee' | 'admin'>('employee');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [orgSelected, setOrgSelected] = useState<string>('');
  const [orgNewName, setOrgNewName] = useState<string>('');
  const [isNewOrg, setIsNewOrg] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const res = await api.get('/organizations/');
        setOrganizations(res.data.results || res.data);
      } catch (err) {
        console.error("Error loading organizations list:", err);
      }
    };
    fetchOrgs();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload: any = {
      username,
      email,
      password,
      first_name: firstName,
      last_name: lastName,
      phone_number: phoneNumber,
      role
    };

    if (isNewOrg) {
      if (!orgNewName.trim()) {
        setError("Please enter the name of the new organization.");
        setLoading(false);
        return;
      }
      payload.organization_name = orgNewName;
    } else {
      if (!orgSelected) {
        setError("Please select your organization.");
        setLoading(false);
        return;
      }
      payload.organization = Number(orgSelected);
    }

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

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6 relative overflow-hidden font-sans">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/10 rounded-full blur-3xl -z-10"></div>

      <div className="w-full max-w-xl bg-card border border-border rounded-2xl shadow-xl overflow-hidden p-8 sm:p-10 my-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold tracking-tight">Create an Account</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Join the corporate carpooling community
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
              Work Email Address
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
                placeholder="john@company.com"
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

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Corporate Account Role
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setRole('employee')}
                className={`py-2 px-4 rounded-xl border text-sm font-semibold transition-all ${
                  role === 'employee'
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'bg-background border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                Employee
              </button>
              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`py-2 px-4 rounded-xl border text-sm font-semibold transition-all flex items-center justify-center space-x-1.5 ${
                  role === 'admin'
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'bg-background border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <ShieldAlert size={14} />
                <span>Company Admin</span>
              </button>
            </div>
          </div>

          {/* Organization Select Layer */}
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center space-x-1">
                <Building size={14} />
                <span>Corporate Workspace</span>
              </label>
              <button
                type="button"
                onClick={() => setIsNewOrg(!isNewOrg)}
                className="text-xs text-primary font-semibold hover:underline"
              >
                {isNewOrg ? "Select Existing Organization" : "Create New Organization"}
              </button>
            </div>

            {isNewOrg ? (
              <div className="space-y-1.5 animate-pulse-slow">
                <input
                  type="text"
                  required={isNewOrg}
                  value={orgNewName}
                  onChange={(e) => setOrgNewName(e.target.value)}
                  placeholder="e.g. Acme Corporation"
                  className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-2.5 text-sm transition-all outline-none"
                />
                <p className="text-[10px] text-muted-foreground">
                  Creating a new organization will map it to your email domain automatically.
                </p>
              </div>
            ) : (
              <select
                required={!isNewOrg}
                value={orgSelected}
                onChange={(e) => setOrgSelected(e.target.value)}
                className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-2.5 text-sm transition-all outline-none"
              >
                <option value="">-- Choose Corporate Workspace --</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} ({org.domain})
                  </option>
                ))}
              </select>
            )}
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
    </div>
  );
};
