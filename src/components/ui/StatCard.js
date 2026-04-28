'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export function StatCard({ value, label, icon, color = 'gold', trend, trendLabel, delay = 0 }) {
  const colorMap = {
    gold: 'var(--rocks-gold)',
    blue: 'var(--electric-blue-light)',
    green: 'var(--green)',
    red: 'var(--red)',
    teal: 'var(--teal)',
    purple: 'var(--purple)',
    amber: 'var(--amber)',
    crimson: 'var(--rocks-crimson-light)',
  };

  return (
    <motion.div
      className="stat-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      {icon && <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{icon}</div>}
      <AnimatedCounter value={value} color={colorMap[color] || colorMap.gold} />
      <div className="stat-label">{label}</div>
      {trend !== undefined && (
        <div className={`stat-trend ${trend >= 0 ? 'up' : 'down'}`}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          {trendLabel && <span style={{ color: 'var(--text-dim)', marginLeft: '4px' }}>{trendLabel}</span>}
        </div>
      )}
    </motion.div>
  );
}

function AnimatedCounter({ value, color }) {
  const ref = useRef(null);
  const isNumber = typeof value === 'number' || !isNaN(parseFloat(value));

  useEffect(() => {
    if (!ref.current || !isNumber) return;

    const target = parseFloat(value);
    const isPercent = String(value).includes('%');
    const duration = 1200;
    const start = performance.now();

    function animate(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      const current = Math.round(eased * target);

      if (ref.current) {
        ref.current.textContent = isPercent ? `${current}%` : current;
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }

    requestAnimationFrame(animate);
  }, [value, isNumber]);

  if (!isNumber) {
    return <div className="stat-value" style={{ color }}>{value}</div>;
  }

  return <div className="stat-value" ref={ref} style={{ color }}>0</div>;
}
