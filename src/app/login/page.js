'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Shield, Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { signIn, getUserWithProfile, getPortalPath } from '@/lib/supabase';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast.error(error.message || 'Invalid credentials');
      setLoading(false);
      return;
    }

    const { profile } = await getUserWithProfile();
    const redirectPath = getPortalPath(profile);
    toast.success('Welcome back!');
    router.push(redirectPath);
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Left — Branding */}
      <div
        className="hide-mobile"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '3rem',
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(165deg, #0D1B2A 0%, #060E18 50%, #1a0a0a 100%)',
        }}
      >
        {/* Animated orbs */}
        <div style={{
          position: 'absolute', top: '20%', left: '20%', width: 300, height: 300,
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,168,67,0.08) 0%, transparent 70%)',
          animation: 'pulse 6s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', bottom: '20%', right: '20%', width: 400, height: 400,
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(198,40,40,0.06) 0%, transparent 70%)',
          animation: 'pulse 8s ease-in-out infinite 1s',
        }} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}
        >
          {/* Logo */}
          <div style={{
            width: 100, height: 100, borderRadius: 24,
            background: 'linear-gradient(135deg, var(--rocks-gold), var(--rocks-gold-light))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 2rem', boxShadow: '0 8px 40px rgba(212,168,67,0.2)',
          }}>
            <Shield size={50} color="var(--rocks-navy-deep)" strokeWidth={2} />
          </div>

          <h1 className="heading-display" style={{
            fontSize: 'clamp(2.5rem, 4vw, 3.5rem)',
            letterSpacing: '-0.04em',
            marginBottom: '0.75rem',
          }}>
            DELRAY<br />
            <span className="gradient-text">ROCKS</span>
          </h1>

          <p style={{ color: 'var(--text-dim)', fontSize: 'var(--text-base)', maxWidth: 380, lineHeight: 1.7 }}>
            Youth Football Intelligence Platform — 
            AI-powered video analysis, real-time evaluations, and player development.
          </p>

          <div style={{
            display: 'flex', gap: '2rem', justifyContent: 'center',
            marginTop: '3rem', color: 'var(--text-muted)', fontSize: 'var(--text-xs)',
            textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600,
          }}>
            <span>🏈 8U Football</span>
            <span>📍 Delray Beach, FL</span>
          </div>
        </motion.div>
      </div>

      {/* Right — Login Form */}
      <div style={{
        flex: 1,
        maxWidth: 560,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 2rem',
      }}>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{ width: '100%', maxWidth: 400 }}
        >
          <div style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, letterSpacing: '-0.02em' }}>
              Welcome back
            </h2>
            <p style={{ color: 'var(--text-dim)', fontSize: 'var(--text-sm)', marginTop: '0.5rem' }}>
              Sign in to access your portal
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{
                  position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }} />
                <input
                  id="login-email"
                  type="email"
                  className="form-input"
                  placeholder="coach@delrayrocks.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{ paddingLeft: 40 }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="login-password">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{
                  position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }} />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ paddingLeft: 40, paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                    padding: 0, display: 'flex',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <a
                href="/forgot-password"
                style={{ fontSize: 'var(--text-xs)', color: 'var(--rocks-gold)', fontWeight: 600 }}
              >
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{ width: '100%', marginTop: '0.5rem' }}
            >
              {loading ? (
                <span style={{
                  width: 18, height: 18, border: '2px solid rgba(13,27,42,0.3)',
                  borderTopColor: 'var(--rocks-navy-deep)', borderRadius: '50%',
                  animation: 'spin 0.6s linear infinite',
                }} />
              ) : (
                <>
                  Sign In
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div style={{
            marginTop: '2rem', textAlign: 'center',
            fontSize: 'var(--text-xs)', color: 'var(--text-muted)',
          }}>
            Need an account?{' '}
            <a href="/signup" style={{ color: 'var(--rocks-gold)', fontWeight: 600 }}>
              Contact your coach for an invite
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
