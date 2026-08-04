import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, KeyRound, CheckCircle, ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { loginSchema } from '../lib/validators';
import useAuth from '../hooks/useAuth';
import useAuthStore from '../store/authStore';
import api from '../services/api';
import { toast } from 'sonner';
import gsap from 'gsap';

export default function Login() {
  const { login, isLoading, error: authError } = useAuth();
  const navigate = useNavigate();

  // 'login' | 'forgot_email' | 'forgot_otp' | 'forgot_reset'
  const [mode, setMode] = useState('login');

  // Forgot password form states
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpError, setOtpError] = useState('');

  const cardRef = useRef(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  // GSAP Entry Animation
  useEffect(() => {
    if (cardRef.current) {
      gsap.fromTo(
        cardRef.current,
        { opacity: 0, y: 24, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'power3.out' }
      );
      gsap.fromTo(
        cardRef.current.querySelectorAll('.gsap-item'),
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.06, ease: 'power2.out', delay: 0.15 }
      );
    }
  }, [mode]);

  const onSubmitLogin = async (data) => {
    const result = await login(data.email, data.password);
    if (result.success) {
      toast.success('Signed in successfully!');
      navigate('/chat');
    } else {
      toast.error(result.error || 'Failed to sign in. Please check your credentials.');
    }
  };

  // Forgot Password Step 1: Send OTP to Email via Brevo SMTP Relay
  const handleSendResetOtp = async (e) => {
    e.preventDefault();
    if (!resetEmail || !resetEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsSendingOtp(true);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);

    try {
      const res = await api.sendOtp(resetEmail, code, true);
      setIsSendingOtp(false);

      if (res && res.success !== false) {
        toast.success(`Verification code sent to ${resetEmail}! Check your inbox.`);
        setMode('forgot_otp');
      } else {
        toast.error(res?.error || 'Failed to send verification email');
      }
    } catch (err) {
      setIsSendingOtp(false);
      const rawErr = err.response?.data?.error || err.message || 'Failed to send verification email';
      const msg = typeof rawErr === 'object' ? (rawErr.message || JSON.stringify(rawErr)) : String(rawErr);
      toast.error(msg);
    }
  };

  // Forgot Password Step 2: Verify OTP
  const handleVerifyResetOtp = (e) => {
    e.preventDefault();
    setOtpError('');

    const cleanEnteredOtp = (resetOtp || '').replace(/\s/g, '');
    if (cleanEnteredOtp.length < 6) {
      setOtpError('Please enter the full 6-digit OTP code');
      return;
    }

    if (cleanEnteredOtp === generatedOtp.trim()) {
      toast.success('OTP verified successfully!');
      setMode('forgot_reset');
    } else {
      setOtpError('Invalid OTP code. Please check your email and try again.');
      toast.error('Incorrect OTP code');
    }
  };

  // Forgot Password Step 3: Real Database Password Reset
  const handleResetPasswordSave = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      setIsSendingOtp(true);
      const res = await api.resetPassword(resetEmail, newPassword);
      setIsSendingOtp(false);

      if (res.success) {
        toast.success('Password updated successfully in database! Logging you in...');
        
        if (res.token && res.user) {
          localStorage.setItem('convo-token', res.token);
          localStorage.setItem('convo-user', JSON.stringify(res.user));
          useAuthStore.setState({
            user: res.user,
            token: res.token,
            isAuthenticated: true,
          });
          navigate('/chat');
        } else {
          setMode('login');
        }

        setResetEmail('');
        setResetOtp('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(res.error || 'Failed to update password');
      }
    } catch (err) {
      setIsSendingOtp(false);
      const msg = err.response?.data?.error || err.message || 'Password reset failed';
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-doodle px-4">
      <div
        ref={cardRef}
        className="glass-card w-full max-w-[420px] p-7 sm:p-9 rounded-[28px] border border-border-subtle shadow-2xl relative overflow-hidden"
      >
        {/* Logo / Branding */}
        <div className="gsap-item flex flex-col items-center mb-6">
          <img
            src="https://res.cloudinary.com/dhudpc4eu/image/upload/v1783846792/pixora-uploads/pixora-1783846792355-cpvfbu.png"
            alt="Convo Logo"
            className="w-14 h-14 rounded-2xl shadow-xl object-cover mb-3"
          />
          <h1 className="font-heading text-2xl font-extrabold text-text-primary text-center">
            {mode === 'login' && 'Welcome back'}
            {mode === 'forgot_email' && 'Reset Password'}
            {mode === 'forgot_otp' && 'Verify Reset OTP'}
            {mode === 'forgot_reset' && 'Create New Password'}
          </h1>
          <p className="font-sans text-text-secondary text-sm font-medium mt-1 text-center">
            {mode === 'login' && 'Sign in to continue to Convo'}
            {mode === 'forgot_email' && 'Enter your registered email address'}
            {mode === 'forgot_otp' && `Enter code sent to ${resetEmail}`}
            {mode === 'forgot_reset' && 'Set a strong new password for your account'}
          </p>
        </div>

        {/* Global Auth Error Alert */}
        {authError && mode === 'login' && (
          <div className="gsap-item mb-4 p-3 rounded-xl bg-accent-strong/15 border border-accent-strong/40 text-accent-strong text-xs font-semibold text-center font-sans">
            {authError}
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* ── MODE 1: MAIN LOGIN FORM ── */}
          {mode === 'login' && (
            <motion.form
              key="login_form"
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 15 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleSubmit(onSubmitLogin)}
              className="space-y-4"
              noValidate
            >
              {/* Email Address */}
              <div className="gsap-item">
                <label htmlFor="login-email" className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5 font-heading">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="convo-input-icon" size={18} />
                  <input
                    id="login-email"
                    type="text"
                    autoComplete="username"
                    placeholder="you@example.com"
                    className={`convo-input convo-input-with-icon ${errors.email ? 'border-accent-strong' : ''}`}
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <p className="text-accent-strong text-xs font-semibold mt-1 font-sans">{errors.email.message}</p>
                )}
              </div>

              {/* Password Input */}
              <div className="gsap-item">
                <label htmlFor="login-password" className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5 font-heading">
                  Password
                </label>
                <div className="relative">
                  <Lock className="convo-input-icon" size={18} />
                  <input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className={`convo-input convo-input-with-icon ${errors.password ? 'border-accent-strong' : ''}`}
                    {...register('password')}
                  />
                </div>
                {errors.password && (
                  <p className="text-accent-strong text-xs font-semibold mt-1 font-sans">{errors.password.message}</p>
                )}
              </div>

              {/* Forgot Password Button (Positioned AFTER Password Input Section) */}
              <div className="gsap-item flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot_email');
                    setResetEmail('');
                  }}
                  className="font-sans text-xs font-semibold text-accent hover:text-accent-hover transition-colors cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>

              {/* Sign In Submit Button */}
              <div className="gsap-item pt-1">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="convo-button convo-button-primary w-full flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </div>

              {/* Register Redirect */}
              <p className="gsap-item font-sans text-center text-xs text-text-secondary pt-2">
                Don't have an account?{' '}
                <Link to="/register" className="text-accent font-bold hover:underline">
                  Sign up
                </Link>
              </p>
            </motion.form>
          )}

          {/* ── MODE 2: FORGOT PASSWORD - EMAIL ── */}
          {mode === 'forgot_email' && (
            <motion.form
              key="forgot_email_form"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleSendResetOtp}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5 font-heading">
                  Your Email Address
                </label>
                <div className="relative">
                  <Mail className="convo-input-icon" size={18} />
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="convo-input convo-input-with-icon"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSendingOtp}
                className="convo-button convo-button-primary w-full flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSendingOtp ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Sending Code...
                  </>
                ) : (
                  'Send Verification Code'
                )}
              </button>

              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full text-center text-xs font-bold text-text-secondary hover:text-text-primary flex items-center justify-center gap-1 cursor-pointer pt-1"
              >
                <ArrowLeft size={14} /> Back to Sign In
              </button>
            </motion.form>
          )}

          {/* ── MODE 3: FORGOT PASSWORD - VERIFY OTP ── */}
          {mode === 'forgot_otp' && (
            <motion.form
              key="forgot_otp_form"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleVerifyResetOtp}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5 font-heading text-center">
                  6-Digit Verification Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="000000"
                  value={resetOtp}
                  onChange={(e) => setResetOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full bg-[#18181c] text-white text-center font-mono font-extrabold text-2xl tracking-[0.4em] py-3 rounded-2xl border border-accent/40 focus:border-accent outline-none shadow-inner"
                />
                {otpError && (
                  <p className="text-accent-strong text-xs font-semibold mt-2 text-center font-sans">{otpError}</p>
                )}
              </div>

              <button
                type="submit"
                className="convo-button convo-button-primary w-full flex items-center justify-center gap-2 cursor-pointer"
              >
                Verify Code
              </button>

              <button
                type="button"
                onClick={() => setMode('forgot_email')}
                className="w-full text-center text-xs font-bold text-text-secondary hover:text-text-primary flex items-center justify-center gap-1 cursor-pointer pt-1"
              >
                <ArrowLeft size={14} /> Change Email
              </button>
            </motion.form>
          )}

          {/* ── MODE 4: FORGOT PASSWORD - CREATE NEW PASSWORD ── */}
          {mode === 'forgot_reset' && (
            <motion.form
              key="forgot_reset_form"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleResetPasswordSave}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5 font-heading">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="convo-input-icon" size={18} />
                  <input
                    type="password"
                    required
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="convo-input convo-input-with-icon"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5 font-heading">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="convo-input-icon" size={18} />
                  <input
                    type="password"
                    required
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="convo-input convo-input-with-icon"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSendingOtp}
                className="convo-button convo-button-primary w-full flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSendingOtp ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Updating Password...
                  </>
                ) : (
                  'Reset Password & Sign In'
                )}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
