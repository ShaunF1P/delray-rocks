'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function LiveGamePage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/coach/sideline');
    }, 3000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div style={{
      minHeight: '60vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      gap: 16,
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          padding: '24px 32px',
          background: 'rgba(0,154,68,0.08)',
          border: '1px solid rgba(0,154,68,0.25)',
          borderRadius: 12,
          maxWidth: 420,
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 12 }}>🏈</div>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, color: '#4ADE80' }}>
          Scoreboard Moved
        </h2>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
          The live scoreboard is now integrated into the <strong style={{ color: '#FDB913' }}>Sideline Play Caller</strong>.
          Score tracking, quarter management, and play calling are all in one place.
        </p>
        <div style={{ marginTop: 16, fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
          Redirecting in 3 seconds…
        </div>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ duration: 3, ease: 'linear' }}
          style={{ height: 2, background: '#009A44', borderRadius: 1, marginTop: 8 }}
        />
      </motion.div>
    </div>
  );
}
