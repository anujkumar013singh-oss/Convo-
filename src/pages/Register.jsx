import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import { Mail, Phone, Lock, User, Check, X, Loader2, ArrowLeft, ArrowRight, KeyRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import useDebounce from '../hooks/useDebounce';
import api from '../services/api';
import { sendEmailOtp } from '../services/emailService';
import { toast } from 'sonner';

// FontAwesome Regular Camera (far camera) Icon Component
const FontAwesomeFarCamera = ({ className = "w-5 h-5 text-white" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 512 512"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M149.1 64c-11.3 0-21.7 6.4-26.9 16.5L103.5 112H64C28.7 112 0 140.7 0 176v240c0 35.3 28.7 64 64 64h384c35.3 0 64-28.7 64-64V176c0-35.3-28.7-64-64-64h-39.5l-18.7-31.5c-5.2-10.1-15.6-16.5-26.9-16.5H149.1zM256 208a96 96 0 1 1 0 192 96 96 0 1 1 0-192zm-48 96a48 48 0 1 0 96 0 48 48 0 1 0 -96 0z" />
  </svg>
);

export default function Register() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const cardRef = useRef(null);
  const fileInputRef = useRef(null);
  const otpRefs = useRef([]);

  // Onboarding Wizard Step State: 1 | 2 | 3 | 4 | 5
  const [step, setStep] = useState(1);

  // Form Data State
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpError, setOtpError] = useState('');

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [avatarUrl, setAvatarUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const debouncedUsername = useDebounce(username, 400);

  // GSAP Entrance Timeline
  useEffect(() => {
    if (!cardRef.current) return;
    gsap.fromTo(
      cardRef.current,
      { opacity: 0, scale: 0.95, y: 15 },
      { opacity: 1, scale: 1, y: 0, duration: 0.45, ease: 'power3.out' }
    );
  }, []);

  // Username live availability check
  useEffect(() => {
    if (!debouncedUsername || debouncedUsername.length < 3) {
      setUsernameStatus(null);
      return;
    }

    let cancelled = false;
    setUsernameStatus('checking');

    api.checkUsername(debouncedUsername).then(({ available }) => {
      if (!cancelled) {
        setUsernameStatus(available ? 'available' : 'taken');
      }
    });

    return () => { cancelled = true; };
  }, [debouncedUsername]);

  // Step 1 Submit: Check database for Email & Phone uniqueness FIRST before sending OTP
  const handleStep1Submit = async (e) => {
    e.preventDefault();
    setEmailError('');
    setPhoneError('');

    if (!email || !email.includes('@')) {
      setEmailError('Please enter a valid email address');
      toast.error('Please enter a valid email address');
      return;
    }
    if (!phone || phone.trim().length < 6) {
      setPhoneError('Mobile number is required!');
      toast.error('Mobile number is required!');
      return;
    }

    setIsSendingOtp(true);

    try {
      // Query MongoDB database to check if email or phone is already registered
      const checkRes = await api.checkEmailPhone(email, phone);
      if (checkRes && checkRes.available === false) {
        setIsSendingOtp(false);
        if (checkRes.field === 'email') {
          setEmailError('This email is already registered. Please sign in or use another email.');
          toast.error('This email address is already registered!');
        } else if (checkRes.field === 'phone') {
          setPhoneError('This phone number is already registered.');
          toast.error('This phone number is already registered!');
        } else {
          toast.error(checkRes.error || 'Email or phone number is already registered');
        }
        return; // STOP! Do not send OTP and do NOT advance to Step 2!
      }
    } catch (err) {
      console.warn('Pre-registration database check failed:', err);
    }

    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(newOtp);

    const res = await sendEmailOtp(email, newOtp);
    setIsSendingOtp(false);

    if (res.success) {
      toast.success(`OTP sent to ${email}`);
      setStep(2);
    } else {
      toast.error('Failed to send OTP email');
    }
  };

  // OTP 6-Digit Box Handlers
  const handleOtpBoxChange = (index, value) => {
    const val = value.replace(/\D/g, '').slice(-1);
    const otpArray = (otp || '').padEnd(6, ' ').split('');
    otpArray[index] = val || ' ';
    const combined = otpArray.join('').trimEnd();
    setOtp(combined);

    if (val && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && (!otp[index] || otp[index] === ' ') && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) {
      setOtp(pasted);
      if (pasted.length === 6) {
        otpRefs.current[5]?.focus();
      } else {
        otpRefs.current[pasted.length]?.focus();
      }
    }
  };

  // Step 2 Submit: Verify OTP
  const handleStep2Submit = (e) => {
    e.preventDefault();
    setOtpError('');

    const cleanEnteredOtp = (otp || '').replace(/\s/g, '');
    if (cleanEnteredOtp.length < 6) {
      setOtpError('Please enter the full 6-digit OTP code');
      return;
    }

    if (cleanEnteredOtp === generatedOtp.trim()) {
      toast.success('Email verified successfully!');
      setStep(3);
    } else {
      setOtpError('Invalid OTP code. Please check your email and try again.');
      toast.error('Incorrect OTP code');
    }
  };

  // Step 3 Submit: Name & Username
  const handleStep3Submit = (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error('Your Name is required');
      return;
    }
    if (!username.trim() || username.length < 3) {
      toast.error('Username must be at least 3 characters');
      return;
    }
    if (usernameStatus === 'taken') {
      toast.error('Username is already taken');
      return;
    }

    setStep(4);
  };

  // Step 4 Submit: Password setup
  const handleStep4Submit = (e) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    // Advance to optional DP upload step
    setStep(5);
  };

  // Final Registration Completion (Step 5 Save or Skip)
  const handleFinalComplete = async (finalAvatar = avatarUrl) => {
    setIsSubmitting(true);
    const payload = {
      email,
      phone,
      fullName,
      username,
      password,
      avatarUrl: finalAvatar,
    };

    const result = await registerUser(payload);
    setIsSubmitting(false);

    if (result.success) {
      toast.success('Account created successfully! Welcome to Convo.');
      navigate('/chat');
    } else {
      toast.error(result.error || 'Failed to create account');
    }
  };

  // DP File upload handler
  const handleDpUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      setAvatarUrl(dataUrl);
      toast.success('Profile picture selected!');
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-doodle px-4 py-8">
      <div
        ref={cardRef}
        className="glass-card w-full max-w-[440px] p-7 sm:p-9 rounded-[28px] border border-white/10 shadow-2xl relative overflow-hidden"
      >
        {/* Logo / Branding Header */}
        <div className="flex flex-col items-center mb-6">
          <img
            src="https://res.cloudinary.com/dhudpc4eu/image/upload/v1783846792/pixora-uploads/pixora-1783846792355-cpvfbu.png"
            alt="Convo Logo"
            className="w-14 h-14 rounded-2xl shadow-xl object-cover mb-3"
          />
          <h1 className="font-sans text-2xl font-extrabold text-white text-center">
            Create your account
          </h1>

          {/* Wizard Step Progress Dots */}
          <div className="flex items-center gap-2 mt-4">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`h-2 rounded-full transition-all duration-300 ${
                  s === step
                    ? 'w-8 bg-accent'
                    : s < step
                    ? 'w-2 bg-accent/60'
                    : 'w-2 bg-white/20'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Multi-Step Onboarding Forms */}
        <AnimatePresence mode="wait">
          {/* ── STEP 1: Email & Mobile Number ── */}
          {step === 1 && (
            <motion.form
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleStep1Submit}
              className="space-y-4"
            >
              <div className="text-center mb-2">
                <p className="font-sans text-sm font-semibold text-text-secondary">
                  Step 1 of 5: Contact Details
                </p>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5 font-sans">
                  Email Address <span className="text-accent">*</span>
                </label>
                <div className="relative">
                  <Mail className="convo-input-icon" size={18} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailError('');
                    }}
                    placeholder="name@example.com"
                    className={`convo-input convo-input-with-icon ${emailError ? 'border-accent-strong' : ''}`}
                  />
                </div>
                {emailError && (
                  <p className="text-accent-strong text-xs font-semibold mt-1.5 font-sans">{emailError}</p>
                )}
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5 font-sans">
                  Mobile Number <span className="text-accent">*</span>
                </label>
                <div className="relative">
                  <Phone className="convo-input-icon" size={18} />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setPhoneError('');
                    }}
                    placeholder="Enter mobile number"
                    className={`convo-input convo-input-with-icon ${phoneError ? 'border-accent-strong' : ''}`}
                  />
                </div>
                {phoneError && (
                  <p className="text-accent-strong text-xs font-semibold mt-1.5 font-sans">{phoneError}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSendingOtp}
                className="w-full h-12 rounded-full bg-accent hover:bg-accent-hover text-white font-sans font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer mt-6"
              >
                {isSendingOtp ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    Next (Send OTP) <ArrowRight size={18} />
                  </>
                )}
              </button>

              <p className="font-sans text-center text-xs text-text-secondary pt-2">
                Already have an account?{' '}
                <Link to="/login" className="text-accent font-bold hover:underline">
                  Sign in
                </Link>
              </p>
            </motion.form>
          )}

          {/* ── STEP 2: REDESIGNED MODERN 6-DIGIT OTP VERIFICATION UI ── */}
          {step === 2 && (
            <motion.form
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleStep2Submit}
              className="space-y-4"
            >
              <div className="text-center mb-1">
                <p className="font-sans text-sm font-semibold text-text-secondary">
                  Step 2 of 5: Verification Code
                </p>
                <p className="font-sans text-xs text-text-tertiary mt-1">
                  We've sent a 6-digit code to <span className="text-white font-semibold">{email}</span>
                </p>
              </div>

              <div className="py-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-3 text-center font-sans">
                  Enter 6-Digit OTP
                </label>
                <div className="flex items-center justify-center gap-2 sm:gap-2.5">
                  {[0, 1, 2, 3, 4, 5].map((idx) => (
                    <input
                      key={idx}
                      ref={(el) => (otpRefs.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={otp[idx] || ''}
                      onChange={(e) => handleOtpBoxChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      onPaste={idx === 0 ? handleOtpPaste : undefined}
                      className={`w-11 h-13 sm:w-12 sm:h-14 text-center font-mono font-extrabold text-xl text-white rounded-xl bg-[#1c1c1f] border-2 transition-all outline-none shadow-inner ${
                        otp[idx]
                          ? 'border-accent shadow-[0_0_12px_rgba(135,116,225,0.35)]'
                          : 'border-white/10 hover:border-white/30 focus:border-accent'
                      }`}
                    />
                  ))}
                </div>
                {otpError && (
                  <p className="text-accent-strong text-xs font-semibold mt-3 text-center font-sans">
                    {otpError}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full h-12 rounded-full bg-accent hover:bg-accent-hover text-white font-sans font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer mt-4"
              >
                Verify Code <Check size={18} />
              </button>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full text-center text-xs font-bold text-text-secondary hover:text-white flex items-center justify-center gap-1 cursor-pointer pt-2"
              >
                <ArrowLeft size={14} /> Back to Change Details
              </button>
            </motion.form>
          )}

          {/* ── STEP 3: Full Name & Username ── */}
          {step === 3 && (
            <motion.form
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleStep3Submit}
              className="space-y-4"
            >
              <div className="text-center mb-2">
                <p className="font-sans text-sm font-semibold text-text-secondary">
                  Step 3 of 5: User Profile
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5 font-sans">
                  Full Name <span className="text-accent">*</span>
                </label>
                <div className="relative">
                  <User className="convo-input-icon" size={18} />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    className="convo-input convo-input-with-icon"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5 font-sans">
                  Unique Username <span className="text-accent">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary font-bold text-sm">
                    @
                  </span>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.replace(/^@+/, ''))}
                    placeholder="username"
                    className={`convo-input pl-9 pr-10 ${
                      usernameStatus === 'taken' ? 'border-accent-strong' : ''
                    }`}
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                    {usernameStatus === 'checking' && (
                      <Loader2 size={16} className="animate-spin text-text-tertiary" />
                    )}
                    {usernameStatus === 'available' && (
                      <Check size={16} className="text-emerald-400 font-bold" />
                    )}
                    {usernameStatus === 'taken' && (
                      <X size={16} className="text-accent-strong font-bold" />
                    )}
                  </div>
                </div>
                {usernameStatus === 'taken' && (
                  <p className="text-accent-strong text-xs font-semibold mt-1 font-sans">
                    Username @{username} is already taken. Please choose another handle.
                  </p>
                )}
                {usernameStatus === 'available' && (
                  <p className="text-emerald-400 text-xs font-semibold mt-1 font-sans">
                    Username @{username} is available!
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full h-12 rounded-full bg-accent hover:bg-accent-hover text-white font-sans font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer mt-6"
              >
                Continue <ArrowRight size={18} />
              </button>
            </motion.form>
          )}

          {/* ── STEP 4: Password & Confirmation ── */}
          {step === 4 && (
            <motion.form
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleStep4Submit}
              className="space-y-4"
            >
              <div className="text-center mb-2">
                <p className="font-sans text-sm font-semibold text-text-secondary">
                  Step 4 of 5: Account Security
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5 font-sans">
                  Create Password <span className="text-accent">*</span>
                </label>
                <div className="relative">
                  <Lock className="convo-input-icon" size={18} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="convo-input convo-input-with-icon"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5 font-sans">
                  Confirm Password <span className="text-accent">*</span>
                </label>
                <div className="relative">
                  <Lock className="convo-input-icon" size={18} />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="convo-input convo-input-with-icon"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full h-12 rounded-full bg-accent hover:bg-accent-hover text-white font-sans font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer mt-6"
              >
                Continue <ArrowRight size={18} />
              </button>
            </motion.form>
          )}

          {/* ── STEP 5: OPTIONAL PROFILE PICTURE (DP) UPLOAD ── */}
          {step === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center text-center space-y-6"
            >
              <div>
                <p className="font-sans text-sm font-semibold text-text-secondary">
                  Step 5 of 5: Profile Picture
                </p>
                <p className="font-sans text-xs text-text-tertiary mt-1">
                  Add an optional photo so friends can recognize you
                </p>
              </div>

              {/* Centered Avatar Frame (~140px) with overlapping camera badge */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-[140px] h-[140px] rounded-full relative bg-accent flex items-center justify-center overflow-visible shadow-2xl cursor-pointer group my-2"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Profile preview"
                    className="w-full h-full rounded-full object-cover border-2 border-white/10"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-accent flex items-center justify-center text-4xl font-sans font-bold text-white uppercase border-2 border-white/10">
                    {fullName?.charAt(0) || username?.charAt(0) || 'U'}
                  </div>
                )}

                {/* Overlapping Camera Badge */}
                <div
                  className="w-[48px] h-[48px] rounded-full bg-accent text-white flex items-center justify-center shadow-2xl absolute bottom-0 right-0 border-[4px] border-[#0a0a0a] group-hover:scale-105 transition-transform cursor-pointer"
                  title="Upload profile picture"
                >
                  <FontAwesomeFarCamera className="w-[20px] h-[20px] text-white" />
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleDpUpload}
                className="hidden"
              />

              <div className="w-full space-y-3 pt-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleFinalComplete(avatarUrl)}
                  className="w-full h-12 rounded-full bg-accent hover:bg-accent-hover text-white font-sans font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> Creating Account...
                    </>
                  ) : (
                    'Complete Registration'
                  )}
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleFinalComplete('')}
                  className="w-full text-center text-xs font-bold text-text-secondary hover:text-white transition-colors cursor-pointer py-1"
                >
                  Skip for now
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
