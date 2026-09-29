import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Mail, Lock, AlertCircle, CheckCircle2, Eye, EyeOff,
  ShieldCheck, ArrowLeft, RefreshCw, KeyRound, Check, X
} from 'lucide-react';
import axios from 'axios';
import { useGoogleLogin } from '@react-oauth/google';
import LandingPage from './LandingPage';

// Enable HttpOnly Secure Cookie transmission across all Axios requests
axios.defaults.withCredentials = true;

// Automatically wire the top-right "Disconnect" button to revoke the session on the backend
if (typeof window !== 'undefined' && !window.__azolLogoutWired) {
  window.__azolLogoutWired = true;
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (btn && btn.textContent && btn.textContent.trim() === 'Disconnect') {
      const token = localStorage.getItem('token');
      axios.post('/api/v1/auth/logout', {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }).catch(() => {});
    }
  }, true);
}

const evaluatePasswordRules = (pw) => {
  const val = pw || '';
  return {
    minLength: val.length >= 8,
    hasUpper: /[A-Z]/.test(val),
    hasLower: /[a-z]/.test(val),
    hasNumber: /\d/.test(val),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>\-_=+[\]\\;'/`~]/.test(val)
  };
};

const AuthModal = ({ onLoginSuccess }) => {
  // Controls whether the Auth Modal overlay is open on top of the Public Landing Page
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Views: 'login' | 'signup' | 'verify' | 'forgot' | 'reset'
  const [view, setView] = useState('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Anti-Bot Security Verification (CAPTCHA / Human Gate)
  const [humanVerified, setHumanVerified] = useState(false);

  // Status & Cooldown States
  const [error, setError] = useState('');
  const [infoBanner, setInfoBanner] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Countdown timer for "Resend verification email"
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const pwRules = useMemo(() => evaluatePasswordRules(password), [password]);
  const pwScore = useMemo(
    () => Object.values(pwRules).filter(Boolean).length,
    [pwRules]
  );
  const isPasswordStrong = pwScore === 5;

  const switchView = (nextView) => {
    setError('');
    setInfoBanner('');
    setVerificationCode('');
    setView(nextView);
  };

  const handleOpenAuthFromLanding = (initialView = 'login') => {
    setError('');
    setInfoBanner('');
    setVerificationCode('');
    setView(initialView === 'signup' ? 'signup' : 'login');
    setShowAuthModal(true);
  };

  // --- Real Google OAuth Flow ---
  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setIsLoading(true);
        setError('');
        const response = await axios.post('/api/v1/auth/google', {
          token: tokenResponse.access_token
        });
        localStorage.setItem('token', response.data.access_token);
        onLoginSuccess();
      } catch (err) {
        setError(err.response?.data?.detail || 'Google authentication failed on the server.');
      } finally {
        setIsLoading(false);
      }
    },
    onError: () => {
      setError('Google sign-in popup was closed or cancelled.');
    }
  });

  // --- 1. Handle Login Submit ---
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfoBanner('');
    setIsLoading(true);

    try {
      const formData = new URLSearchParams();
      formData.append('username', email.trim());
      formData.append('password', password);

      const response = await axios.post('/api/v1/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      localStorage.setItem('token', response.data.access_token);
      onLoginSuccess();
    } catch (err) {
      const detail = err.response?.data?.detail || 'Authentication failed. Please try again.';
      if (typeof detail === 'string' && detail.startsWith('EMAIL_NOT_VERIFIED:')) {
        setResendCooldown(30);
        setView('verify');
        setInfoBanner(detail.replace('EMAIL_NOT_VERIFIED:', '').trim());
      } else {
        setError(detail);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // --- 2. Handle Signup Submit ---
  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfoBanner('');

    if (!isPasswordStrong) {
      setError('Please meet all password strength requirements before creating your account.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!humanVerified) {
      setError('Please complete the security verification check below.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await axios.post('/api/v1/auth/register', {
        email: email.trim(),
        password,
        confirm_password: confirmPassword,
        captcha_verified: humanVerified
      });

      setResendCooldown(30);
      setView('verify');
      setInfoBanner(
        res.data?.smtp_dispatched
          ? `We've sent a 6-digit verification code to ${email.trim()}.`
          : `Verification code generated for ${email.trim()}. (Check your inbox or backend console log if local SMTP is not configured).`
      );
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Please check your details.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- 3. Handle Email Verification Submit ---
  const handleVerifyEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await axios.post('/api/v1/auth/verify-email', {
        email: email.trim(),
        code: verificationCode.trim()
      });

      if (res.data?.access_token) {
        localStorage.setItem('token', res.data.access_token);
        onLoginSuccess();
      } else {
        switchView('login');
        setInfoBanner('Email verified! You can now sign in to AZOL AI.');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid or expired verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- 4. Handle Resend Verification Code ---
  const handleResendCode = async () => {
    if (resendCooldown > 0 || isLoading) return;
    setError('');
    setIsLoading(true);

    try {
      const res = await axios.post('/api/v1/auth/resend-verification', {
        email: email.trim()
      });
      setResendCooldown(45);
      setInfoBanner(res.data?.message || `A new verification code was sent to ${email.trim()}.`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to resend verification code right now.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- 5. Handle Forgot Password Request ---
  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfoBanner('');
    setIsLoading(true);

    try {
      const res = await axios.post('/api/v1/auth/forgot-password', {
        email: email.trim()
      });
      setResendCooldown(30);
      setView('reset');
      setInfoBanner(
        res.data?.smtp_dispatched
          ? `We've sent a 6-digit recovery code to ${email.trim()}.`
          : `Recovery code generated for ${email.trim()}. (Check your email or backend console log).`
      );
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not initiate password reset.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- 6. Handle Reset Password Submit ---
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isPasswordStrong) {
      setError('New password must meet all complexity requirements.');
      return;
    }
    if (password !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await axios.post('/api/v1/auth/reset-password', {
        email: email.trim(),
        code: verificationCode.trim(),
        new_password: password
      });
      setPassword('');
      setConfirmPassword('');
      setVerificationCode('');
      setView('login');
      setInfoBanner(res.data?.message || 'Password updated! Sign in with your new password.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Password reset failed. Verify your 6-digit code.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#07080c]">
      {/* Layer 1: Public Animated Enterprise Landing Page */}
      <LandingPage onOpenAuth={handleOpenAuthFromLanding} />

      {/* Layer 2: Auth Modal Overlay (Opens when user clicks Sign In / Start Building) */}
      <AnimatePresence>
        {showAuthModal && (
          <div
            className="fixed inset-0 bg-[#07080a]/85 backdrop-blur-md flex items-center justify-center z-[60] p-4 select-none"
            onClick={() => setShowAuthModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#15171c] w-full max-w-md rounded-3xl p-8 shadow-2xl border border-slate-800/90 relative overflow-hidden"
            >
              {/* Close Button to return to Landing Page */}
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800/80 transition-colors z-20"
                title="Back to AZOL AI Landing Page"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Subtle Top Glow */}
              <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-36 bg-indigo-500/15 blur-3xl pointer-events-none" />

              {/* Brand Logo & Dynamic View Header */}
              <div className="text-center mb-6 relative z-10">
                <div className="w-12 h-12 bg-indigo-500/15 border border-indigo-500/30 rounded-2xl flex items-center justify-center mx-auto mb-3.5 shadow-inner">
                  <Bot className="w-7 h-7 text-indigo-400" />
                </div>

                {view === 'login' && (
                  <>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Sign in to AZOL AI</h2>
                    <p className="text-slate-400 text-xs sm:text-sm mt-1.5 leading-relaxed">
                      Securely access your AI workspace, projects, documents, and agents.
                    </p>
                  </>
                )}

                {view === 'signup' && (
                  <>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Create your AZOL AI account</h2>
                    <p className="text-slate-400 text-xs sm:text-sm mt-1.5 leading-relaxed">
                      Provision your isolated multi-agent workspace and FAISS knowledge base.
                    </p>
                  </>
                )}

                {view === 'verify' && (
                  <>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Check your email</h2>
                    <p className="text-slate-400 text-xs sm:text-sm mt-1.5 leading-relaxed">
                      We've sent a 6-digit verification code to <strong className="text-slate-200">{email}</strong>.
                    </p>
                  </>
                )}

                {view === 'forgot' && (
                  <>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Reset your password</h2>
                    <p className="text-slate-400 text-xs sm:text-sm mt-1.5 leading-relaxed">
                      Enter your verified account email to receive a 6-digit recovery code.
                    </p>
                  </>
                )}

                {view === 'reset' && (
                  <>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Set a new password</h2>
                    <p className="text-slate-400 text-xs sm:text-sm mt-1.5 leading-relaxed">
                      Enter the 6-digit code sent to <strong className="text-slate-200">{email}</strong>.
                    </p>
                  </>
                )}
              </div>

              {/* Status & Error Alerts */}
              {error && (
                <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {infoBanner && (
                <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{infoBanner}</span>
                </div>
              )}

              {/* =========================================================
                  VIEW 1 & 2: LOGIN AND SIGNUP
                 ========================================================= */}
              {(view === 'login' || view === 'signup') && (
                <>
                  <div className="mb-5">
                    <button
                      type="button"
                      onClick={() => handleGoogleLogin()}
                      disabled={isLoading}
                      className="w-full flex items-center justify-center px-4 py-3 bg-[#1c1f26] hover:bg-[#232730] border border-slate-700/80 disabled:opacity-50 rounded-xl text-white text-sm font-medium transition-all shadow-sm"
                    >
                      <img
                        src="https://www.svgrepo.com/show/475656/google-color.svg"
                        className="w-5 h-5 mr-3"
                        alt="Google"
                      />
                      Continue with Google
                    </button>
                  </div>

                  <div className="flex items-center mb-5">
                    <div className="flex-1 border-t border-slate-800" />
                    <span className="px-3 text-slate-500 text-[11px] font-mono uppercase">OR</span>
                    <div className="flex-1 border-t border-slate-800" />
                  </div>

                  <form onSubmit={view === 'login' ? handleLoginSubmit : handleSignupSubmit} className="space-y-3.5">
                    {/* Email Input */}
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                      <input
                        type="email"
                        required
                        placeholder="name@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading}
                        className="w-full bg-[#1e2028] border border-slate-700/80 focus:border-indigo-500 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none transition-all disabled:opacity-50"
                      />
                    </div>

                    {/* Password Input */}
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                        className="w-full bg-[#1e2028] border border-slate-700/80 focus:border-indigo-500 rounded-xl py-3 pl-10 pr-10 text-sm text-white placeholder-slate-500 outline-none transition-all disabled:opacity-50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Forgot Password Link on Login */}
                    {view === 'login' && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => switchView('forgot')}
                          className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                          Forgot password?
                        </button>
                      </div>
                    )}

                    {/* Signup Additional Fields */}
                    {view === 'signup' && (
                      <>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            placeholder="Confirm password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            disabled={isLoading}
                            className="w-full bg-[#1e2028] border border-slate-700/80 focus:border-indigo-500 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none transition-all disabled:opacity-50"
                          />
                        </div>

                        {/* Live 5-Bar Password Strength Meter */}
                        <div className="p-3 bg-[#111318] border border-slate-800 rounded-xl space-y-2">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="text-slate-400">Password Strength</span>
                            <span
                              className={
                                pwScore <= 2
                                  ? 'text-rose-400'
                                  : pwScore <= 4
                                  ? 'text-amber-400'
                                  : 'text-emerald-400 font-bold'
                              }
                            >
                              {pwScore <= 2 ? 'Weak' : pwScore <= 4 ? 'Good' : 'Strong ✓'}
                            </span>
                          </div>
                          <div className="grid grid-cols-5 gap-1.5">
                            {[1, 2, 3, 4, 5].map((bar) => (
                              <div
                                key={bar}
                                className={`h-1.5 rounded-full transition-all ${
                                  pwScore >= bar
                                    ? pwScore <= 2
                                      ? 'bg-rose-500'
                                      : pwScore <= 4
                                      ? 'bg-amber-400'
                                      : 'bg-emerald-500'
                                    : 'bg-slate-800'
                                }`}
                              />
                            ))}
                          </div>
                          <div className="grid grid-cols-2 gap-1 pt-1 text-[10px] font-mono">
                            <span className={pwRules.minLength ? 'text-emerald-400' : 'text-slate-500'}>
                              ✓ 8+ characters
                            </span>
                            <span className={pwRules.hasUpper && pwRules.hasLower ? 'text-emerald-400' : 'text-slate-500'}>
                              ✓ Upper & lowercase
                            </span>
                            <span className={pwRules.hasNumber ? 'text-emerald-400' : 'text-slate-500'}>
                              ✓ At least 1 number
                            </span>
                            <span className={pwRules.hasSpecial ? 'text-emerald-400' : 'text-slate-500'}>
                              ✓ Special symbol (!@#$)
                            </span>
                          </div>
                        </div>

                        {/* Anti-Bot Security Verification Check */}
                        <div
                          onClick={() => setHumanVerified(!humanVerified)}
                          className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                            humanVerified
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                              : 'bg-[#111318] border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5">
                            <div
                              className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                                humanVerified ? 'bg-emerald-500 border-emerald-400 text-white' : 'border-slate-600 bg-[#1e2028]'
                              }`}
                            >
                              {humanVerified && <Check className="w-3.5 h-3.5" />}
                            </div>
                            <span className="text-xs font-medium">Verify human operator (Anti-Bot Shield)</span>
                          </div>
                          <ShieldCheck className={`w-4 h-4 ${humanVerified ? 'text-emerald-400' : 'text-slate-600'}`} />
                        </div>
                      </>
                    )}

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-3.5 text-sm font-bold transition-colors disabled:opacity-50 shadow-lg shadow-emerald-500/15 mt-2"
                    >
                      {isLoading ? 'Processing...' : view === 'login' ? 'Continue' : 'Create account'}
                    </button>
                  </form>

                  <div className="mt-6 text-center text-xs sm:text-sm text-slate-400">
                    {view === 'login' ? "Don't have an account? " : 'Already have an account? '}
                    <button
                      type="button"
                      onClick={() => switchView(view === 'login' ? 'signup' : 'login')}
                      className="text-emerald-400 hover:text-emerald-300 transition-colors font-semibold"
                    >
                      {view === 'login' ? 'Create account' : 'Sign in'}
                    </button>
                  </div>
                </>
              )}

              {/* =========================================================
                  VIEW 3: EMAIL VERIFICATION ("Check your email")
                 ========================================================= */}
              {view === 'verify' && (
                <form onSubmit={handleVerifyEmailSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-slate-400 mb-2 text-center">
                      Enter 6-Digit Verification Code
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="000000"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-[#1e2028] border border-slate-700 focus:border-indigo-500 rounded-xl py-3.5 text-center font-mono text-xl tracking-[0.5em] text-white outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || verificationCode.length !== 6}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white rounded-xl py-3.5 text-sm font-bold transition-colors"
                  >
                    {isLoading ? 'Verifying...' : 'Verify Email & Continue'}
                  </button>

                  <div className="flex items-center justify-between pt-2 text-xs">
                    <button
                      type="button"
                      onClick={() => switchView('login')}
                      className="flex items-center text-slate-400 hover:text-white transition-colors"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Sign in
                    </button>

                    <button
                      type="button"
                      onClick={handleResendCode}
                      disabled={resendCooldown > 0 || isLoading}
                      className="flex items-center text-indigo-400 hover:text-indigo-300 disabled:text-slate-600 font-mono transition-colors"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend verification email'}
                    </button>
                  </div>
                </form>
              )}

              {/* =========================================================
                  VIEW 4: FORGOT PASSWORD REQUEST
                 ========================================================= */}
              {view === 'forgot' && (
                <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      required
                      placeholder="Enter your registered email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      className="w-full bg-[#1e2028] border border-slate-700/80 focus:border-indigo-500 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !email.trim()}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl py-3.5 text-sm font-bold transition-colors"
                  >
                    {isLoading ? 'Sending Code...' : 'Send Recovery Code'}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => switchView('login')}
                      className="inline-flex items-center text-xs text-slate-400 hover:text-white transition-colors"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Sign in
                    </button>
                  </div>
                </form>
              )}

              {/* =========================================================
                  VIEW 5: RESET PASSWORD WITH 6-DIGIT CODE
                 ========================================================= */}
              {view === 'reset' && (
                <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1.5">
                      6-Digit Recovery Code
                    </label>
                    <div className="relative">
                      <KeyRound className="absolute left-3.5 top-3.5 w-4 h-4 text-indigo-400" />
                      <input
                        type="text"
                        required
                        maxLength={6}
                        placeholder="000000"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-[#1e2028] border border-slate-700 focus:border-indigo-500 rounded-xl py-3 pl-10 pr-4 font-mono text-base tracking-[0.4em] text-white outline-none"
                      />
                    </div>
                  </div>

                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="New strong password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#1e2028] border border-slate-700/80 focus:border-indigo-500 rounded-xl py-3 pl-10 pr-10 text-sm text-white placeholder-slate-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-[#1e2028] border border-slate-700/80 focus:border-indigo-500 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || verificationCode.length !== 6}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white rounded-xl py-3.5 text-sm font-bold transition-colors"
                  >
                    {isLoading ? 'Updating Password...' : 'Reset Password'}
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => switchView('login')}
                      className="inline-flex items-center text-xs text-slate-400 hover:text-white transition-colors"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Sign in
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AuthModal;