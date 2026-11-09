'use client';

import { useState, useEffect } from 'react';

export default function DynamicWatermarkOverlay({ viewerId = 'USER-8921-AZ9', showForensic = true }) {
  const [coords, setCoords] = useState({ x: 20, y: 20 });
  const [opacity, setOpacity] = useState(0.2);

  useEffect(() => {
    if (!showForensic) return;

    // Drifting session watermark animation to defeat AI removal software
    const interval = setInterval(() => {
      const newX = Math.floor(Math.random() * 70) + 15; // 15% to 85% width
      const newY = Math.floor(Math.random() * 70) + 15; // 15% to 85% height
      const newOpacity = (Math.random() * 0.15 + 0.15).toFixed(2); // 0.15 to 0.30 opacity

      setCoords({ x: newX, y: newY });
      setOpacity(newOpacity);
    }, 8000);

    return () => clearInterval(interval);
  }, [showForensic]);

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 30 }}>
      {/* 1. Corner Opacity-Pulsing Static Watermark */}
      <div style={{
        position: 'absolute',
        bottom: '24px',
        right: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        padding: '0.5rem 0.85rem',
        borderRadius: '12px',
        border: '1px solid rgba(34, 211, 238, 0.3)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      }}>
        <img
          src="/play_stream_watermark.svg"
          alt="Watermark"
          style={{ height: '24px', width: 'auto' }}
        />
        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#22D3EE', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
          PROTECTED LIVE STREAM
        </span>
      </div>

      {/* 2. Dynamic Floating Forensic Session Watermark */}
      {showForensic && (
        <div style={{
          position: 'absolute',
          top: `${coords.y}%`,
          left: `${coords.x}%`,
          transition: 'all 2.5s ease-in-out',
          opacity: opacity,
          color: '#FFFFFF',
          fontSize: '0.75rem',
          fontFamily: 'monospace',
          fontWeight: 700,
          letterSpacing: '3px',
          textShadow: '0 2px 4px rgba(0,0,0,0.8)',
          background: 'rgba(0,0,0,0.2)',
          padding: '0.2rem 0.5rem',
          borderRadius: '4px',
          userSelect: 'none',
        }}>
          PLAYSTREAM DRM • {viewerId} • {new Date().toISOString().substring(11, 19)} UTC
        </div>
      )}
    </div>
  );
}
