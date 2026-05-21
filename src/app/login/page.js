'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Shield, User, Lock, ArrowRight, Eye, EyeOff, MapPin } from 'lucide-react';
import { FootballIcon } from '@/components/ui/Icons';
import { signIn, getUserWithProfile, getPortalPath } from '@/lib/supabase';
import { trackLogin } from '@/lib/track';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    // Convert username to email format for Supabase auth
    const email = username.includes('@') ? username : `${username.toLowerCase().trim()}@delrayrocks.app`;
    const { error } = await signIn(email, password);

    if (error) {
      toast.error(error.message || 'Invalid credentials');
      setLoading(false);
      return;
    }

    const { profile } = await getUserWithProfile();
    const redirectPath = getPortalPath(profile);
    const displayName = profile ? `${profile.first_name} ${profile.last_name}` : username;
    trackLogin(displayName);
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
          background: 'linear-gradient(165deg, #0A1A10 0%, #060E0A 50%, #042E18 100%)',
        }}
      >
        {/* Animated orbs */}
        <div style={{
          position: 'absolute', top: '20%', left: '20%', width: 300, height: 300,
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,107,58,0.1) 0%, transparent 70%)',
          animation: 'pulse 6s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', bottom: '20%', right: '20%', width: 400, height: 400,
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(253,185,19,0.06) 0%, transparent 70%)',
          animation: 'pulse 8s ease-in-out infinite 1s',
        }} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}
        >
          {/* Official DR Logo */}
          <img
            src="/dr-logo.jpg"
            alt="Delray Rocks"
            style={{
              width: 120, height: 'auto',
              margin: '0 auto 2rem',
              filter: 'drop-shadow(0 8px 30px rgba(16,107,58,0.4))',
            }}
          />

          <h1 className="heading-display" style={{
            fontSize: 'clamp(2.5rem, 4vw, 3.5rem)',
            letterSpacing: '-0.04em',
            marginBottom: '0.75rem',
          }}>
            DELRAY<br />
            <span className="gradient-text" style={{ display: 'block', color: '#009A44' }}>ROCKS</span>
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
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FootballIcon size={14} color="var(--rocks-green-light)" /> 8U Football</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MapPin size={14} /> Delray Beach, FL</span>
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
              <label className="form-label" htmlFor="login-username">Username</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{
                  position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }} />
                <input
                  id="login-username"
                  type="text"
                  className="form-input"
                  placeholder="gerardm"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  style={{ paddingLeft: 40 }}
                />
              </div>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                First name + last initial (e.g. gerardm)
              </span>
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
              <button
                type="button"
                onClick={() => toast('Contact Coach Shaun to reset your password', { icon: '🔑' })}
                style={{ fontSize: 'var(--text-xs)', color: '#009A44', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Forgot password?
              </button>
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
                  borderTopColor: '#042E18', borderRadius: '50%',
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
            <span style={{ color: '#009A44', fontWeight: 600 }}>
              Contact your coach for an invite
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
