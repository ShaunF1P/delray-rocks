'use client';

import { motion } from 'framer-motion';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(165deg, #0A1A10 0%, #060E0A 50%, #042E18 100%)',
      padding: '2rem',
      textAlign: 'center',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div style={{ fontSize: '6rem', marginBottom: '0.5rem' }}>🏈</div>
        <h1 style={{
          fontSize: 'clamp(3rem, 8vw, 6rem)',
          fontWeight: 900,
          letterSpacing: '-0.04em',
          color: '#fff',
          lineHeight: 1,
          marginBottom: '0.5rem',
        }}>
          4<span style={{ color: '#009A44' }}>0</span>4
        </h1>
        <p style={{
          fontSize: '1.25rem',
          fontWeight: 600,
          color: 'rgba(255,255,255,0.7)',
          marginBottom: '0.5rem',
        }}>
          Fumble! Page not found.
        </p>
        <p style={{
          fontSize: '0.875rem',
          color: 'rgba(255,255,255,0.4)',
          maxWidth: 400,
          lineHeight: 1.6,
          marginBottom: '2rem',
        }}>
          The play you called doesn&apos;t exist in our playbook. Let&apos;s get you back in the huddle.
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <a href="/coach/dashboard" style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.75rem 1.5rem', borderRadius: '10px',
            background: '#009A44', color: '#fff',
            fontWeight: 700, fontSize: '0.875rem',
            textDecoration: 'none', transition: 'transform 150ms',
          }}>
            <Home size={16} /> Back to Dashboard
          </a>
          <button onClick={() => window.history.back()} style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.75rem 1.5rem', borderRadius: '10px',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.7)',
            fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
          }}>
            <ArrowLeft size={16} /> Go Back
          </button>
        </div>
      </motion.div>
    </div>
  );
}
