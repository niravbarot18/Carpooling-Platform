import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { Mail, Lock, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<1 | 2>(1); // 1: request OTP, 2: reset password
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await api.post('/forgot-password/', { email });
      setSuccess(res.data.message || "OTP verification code has been sent to your email.");
      setStep(2);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to send OTP. Make sure the email is registered.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP code.");
      return;
    }

    setLoading(true);

    try {
      const res = await api.post('/reset-password/', {
        email,
        otp,
        new_password: newPassword
      });
      setSuccess(res.data.message || "Password has been reset successfully!");
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to reset password. Check if the OTP is correct and active.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6 relative overflow-hidden font-sans">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/10 rounded-full blur-3xl -z-10"></div>

      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl overflow-hidden p-8 sm:p-10 relative">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-primary/10 text-primary mb-4">
            <KeyRound size={24} />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            {step === 1 ? "Forgot Password?" : "Reset Password"}
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            {step === 1 
              ? "Enter your registered email address to receive a 6-digit OTP code." 
              : "Enter the OTP code sent to your email and set a new password."}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg p-4 mb-6 flex items-start space-x-3">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success message */}
        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs rounded-lg p-4 mb-6 flex items-start space-x-3">
            <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {step === 1 ? (
          /* STEP 1: Request OTP */
          <form onSubmit={handleRequestOtp} className="space-y-5">
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
                  placeholder="e.g. john@example.com"
                  className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl pl-10 pr-4 py-3 text-sm transition-all outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-xl transition-all shadow-md shadow-primary/20 hover:shadow-primary/30 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground"></span>
              ) : (
                <span>Request OTP Code</span>
              )}
            </button>
          </form>
        ) : (
          /* STEP 2: Reset Password with OTP */
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                6-Digit OTP Code
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="e.g. 123456"
                className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-2.5 text-sm transition-all outline-none text-center font-mono tracking-widest text-lg"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                New Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-muted-foreground">
                  <Lock size={16} />
                </span>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl pl-10 pr-4 py-2.5 text-sm transition-all outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Confirm New Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-muted-foreground">
                  <Lock size={16} />
                </span>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl pl-10 pr-4 py-2.5 text-sm transition-all outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-xl transition-all shadow-md shadow-primary/20 hover:shadow-primary/30 flex items-center justify-center space-x-2 mt-2"
            >
              {loading ? (
                <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground"></span>
              ) : (
                <span>Reset Password</span>
              )}
            </button>
          </form>
        )}

        {/* Footer info */}
        <div className="text-center mt-8 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Back to{' '}
            <Link to="/login" className="text-primary hover:underline font-semibold">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
