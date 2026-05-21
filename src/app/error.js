'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Home, AlertTriangle } from 'lucide-react';

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error('App error:', error);
  }, [error]);

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
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '2px solid rgba(239, 68, 68, 0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.5rem',
        }}>
          <AlertTriangle size={36} color="#EF4444" />
        </div>

        <h1 style={{
          fontSize: '1.75rem', fontWeight: 800,
          color: '#fff', marginBottom: '0.5rem',
          letterSpacing: '-0.02em',
        }}>
          Something went wrong
        </h1>
        <p style={{
          fontSize: '0.875rem',
          color: 'rgba(255,255,255,0.5)',
          maxWidth: 400, lineHeight: 1.6,
          marginBottom: '2rem',
        }}>
          We hit an unexpected error. Try refreshing the page, or head back to the dashboard.
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button onClick={() => reset()} style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.75rem 1.5rem', borderRadius: '10px',
            background: '#009A44', color: '#fff', border: 'none',
            fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer',
          }}>
            <RefreshCw size={16} /> Try Again
          </button>
          <a href="/coach/dashboard" style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.75rem 1.5rem', borderRadius: '10px',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.7)',
            fontWeight: 600, fontSize: '0.875rem',
            textDecoration: 'none', cursor: 'pointer',
          }}>
            <Home size={16} /> Dashboard
          </a>
        </div>
      </motion.div>
    </div>
  );
}
