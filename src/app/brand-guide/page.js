'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Layers,
  Palette,
  Type,
  Video,
  Download,
  CheckCircle,
  XCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Camera,
  Tv,
  Smartphone,
  Shield,
  Zap,
  Radio,
  FileCode,
  Sliders,
  Sun,
  Moon,
  Lock,
  Eye,
  Activity,
  Cpu,
  UploadCloud,
  Mail,
  FileCheck
} from 'lucide-react';
import DynamicWatermarkOverlay from '@/components/stream/DynamicWatermarkOverlay';

export default function BrandGuidePage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [copiedHex, setCopiedHex] = useState(null);
  const [isLightMode, setIsLightMode] = useState(false);
  const [cacheBuster, setCacheBuster] = useState('');
  const [enableForensic, setEnableForensic] = useState(true);
  const [simulatedViewer, setSimulatedViewer] = useState('USER-9941-STREAM-PROD');

  useEffect(() => {
    setCacheBuster(`?v=${Date.now()}`);

    // Aggressively unregister stale ServiceWorkers and clear CacheStorage
    if (typeof window !== 'undefined') {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (let registration of registrations) {
            registration.unregister();
          }
        });
      }
      if ('caches' in window) {
        caches.keys().then((names) => {
          for (let name of names) {
            caches.delete(name);
          }
        });
      }
    }
  }, []);

  function copyToClipboard(text, label) {
    navigator.clipboard.writeText(text);
    setCopiedHex(label);
    setTimeout(() => setCopiedHex(null), 2000);
  }

  const tabs = [
    { id: 'overview', label: '1. Cover & Vision', icon: BookOpen },
    { id: 'showcase', label: '2. Editorial Mockups', icon: Tv },
    { id: 'logos', label: '3. Vector Logo System', icon: Layers },
    { id: 'color-type', label: '4. Colors & Typography', icon: Palette },
    { id: 'playbook', label: '5. YouTube & OBS Playbook', icon: Video },
    { id: 'security', label: '6. Anti-Piracy & DRM Security', icon: Lock },
  ];

  // Dynamic Theme Palette
  const theme = {
    bg: isLightMode ? '#F8FAFC' : '#040711',
    cardBg: isLightMode ? '#FFFFFF' : '#0F172A',
    innerCardBg: isLightMode ? '#F1F5F9' : '#0B132B',
    textPrimary: isLightMode ? '#0F172A' : '#F8FAFC',
    textSecondary: isLightMode ? '#475569' : '#94A3B8',
    border: isLightMode ? 'rgba(15, 23, 42, 0.12)' : 'rgba(255, 255, 255, 0.1)',
    badgeBg: isLightMode ? 'rgba(37, 99, 235, 0.1)' : 'rgba(34, 211, 238, 0.1)',
    badgeText: isLightMode ? '#2563EB' : '#22D3EE',
    accentCyan: isLightMode ? '#0891B2' : '#22D3EE',
    accentCobalt: isLightMode ? '#2563EB' : '#3B82F6',
  };

  const vectorAssets = [
    {
      id: 'primary-logo',
      title: 'Primary Horizontal Logo',
      dims: '1800 × 480 px • Master Lockup',
      svg: '/play_stream_logo.svg',
      png: '/play_stream_logo.png',
      badge: 'Master Brand',
    },
    {
      id: 'logo-transparent',
      title: 'Transparent Full-Color Logo',
      dims: '1800 × 480 px • 100% Transparent PNG',
      svg: '/play_stream_logo_transparent.svg',
      png: '/play_stream_logo_transparent.png',
      badge: 'Stream & Web Overlay',
    },
    {
      id: 'logo-dark-transparent',
      title: 'Monochrome Dark Slate Logo',
      dims: '1800 × 480 px • Light Apparel Print',
      svg: '/play_stream_logo_dark_transparent.svg',
      png: '/play_stream_logo_dark_transparent.png',
      badge: 'White Apparel & Merch',
    },
    {
      id: 'mono',
      title: 'Monochrome White Logo',
      dims: '1800 × 480 px • Dark Merch Print',
      svg: '/play_stream_logo_mono.svg',
      png: '/play_stream_logo_mono.png',
      badge: 'Black Hoodies & Caps',
    },
    {
      id: 'yt-watermark',
      title: 'YouTube 1:1 Video Watermark',
      dims: '512 × 512 px (150×150) • < 1MB',
      svg: '/play_stream_youtube_watermark.svg',
      png: '/play_stream_youtube_watermark.png',
      badge: 'YouTube Studio Spec',
    },
    {
      id: 'watermark',
      title: 'OBS Content Protection Watermark',
      dims: '880 × 240 px • Transparent PNG',
      svg: '/play_stream_watermark.svg',
      png: '/play_stream_watermark.png',
      badge: 'Anti-Piracy Stream Tag',
    },
    {
      id: 'lower-third',
      title: 'Live Stream Lower-Third Graphic',
      dims: '1200 × 160 px • OBS & vMix Overlay',
      svg: '/play_stream_lower_third.svg',
      png: '/play_stream_lower_third.png',
      badge: 'Live Broadcast Graphic',
    },
    {
      id: 'avatar',
      title: '1:1 Channel Profile Avatar',
      dims: '1600 × 1600 px (min 98×98) • < 4MB',
      svg: '/play_stream_avatar.svg',
      png: '/play_stream_avatar.png',
      badge: 'YouTube & Socials',
    },
    {
      id: 'banner',
      title: 'YouTube 4K Channel Banner',
      dims: '2560 × 1440 px (min 2048×1152) • < 6MB',
      svg: '/play_stream_banner.svg',
      png: '/play_stream_banner.png',
      badge: 'YouTube 4K Header',
    },
  ];

  const editorialMockups = [
    {
      id: 'merch',
      num: '02.1',
      cat: 'APPAREL & MERCHANDISE',
      title: 'Official Media Crew & Fans Collection',
      desc: 'Monochrome titanium logo applications on heavy black cotton hoodies, broadcast field staff caps, and crew camera vests.',
      img: '/playstream_merch_mockup_1786021072099.jpg',
      color: theme.accentCobalt,
    },
    {
      id: 'camera',
      num: '02.2',
      cat: 'SIDELINE BROADCAST HARDWARE',
      title: 'Field Camera Rigs & XBotGo AI Mounts',
      desc: 'High-visibility cobalt and cyan vinyl badges applied to sideline 4K monitors, auto-tracking mounts, and battery housing.',
      img: '/playstream_field_camera_mockup_1786021083252.jpg',
      color: theme.accentCyan,
    },
    {
      id: 'mobile',
      num: '02.3',
      cat: 'MOBILE & SOCIAL FEED',
      title: 'YouTube Mobile & Instagram Reels',
      desc: 'High-contrast channel avatars and watermarks optimized for 9:16 vertical shorts, reels, and mobile YouTube app viewports.',
      img: '/playstream_mobile_social_mockup_1786021095397.jpg',
      color: theme.accentCobalt,
    },
    {
      id: 'truck',
      num: '02.4',
      cat: 'OUTDOOR BROADCAST FLEET',
      title: 'Mobile Production Van & OB Truck',
      desc: 'Colossal vector branding on fleet production vehicles, providing high-visibility stadium presence during live events.',
      img: '/playstream_broadcast_truck_mockup_1786022775926.jpg',
      color: theme.accentCyan,
    },
    {
      id: 'jumbotron',
      num: '02.5',
      cat: 'ARENA & STADIUM DISPLAYS',
      title: 'Stadium Jumbotron & LED Ribbon Boards',
      desc: 'High-impact 4K stadium displays and animated ribbon graphics for arena sponsorships and live game coverage.',
      img: '/playstream_stadium_jumbotron_mockup_1786022790814.jpg',
      color: theme.accentCobalt,
    },
    {
      id: 'audio',
      num: '02.6',
      cat: 'AUDIO & SIDELINE INTERVIEWS',
      title: 'Reporter Microphone & Studio Headphones',
      desc: '3D cube mic flags and custom headset branding for sideline reporters, press conferences, and podcast studios.',
      img: '/playstream_mic_audio_mockup_1786022806589.jpg',
      color: theme.accentCyan,
    },
    {
      id: 'billboard',
      num: '02.7',
      cat: 'OUTDOOR DIGITAL CAMPAIGNS',
      title: 'City Center Digital Billboards',
      desc: 'Colossal city billboard displays showcasing athletic action shots, live broadcast alerts, and network branding.',
      img: '/playstream_billboard_mockup_1786022821865.jpg',
      color: theme.accentCobalt,
    },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: theme.bg,
      color: theme.textPrimary,
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      padding: '2rem 1.5rem 4rem',
      maxWidth: '1400px',
      margin: '0 auto',
      transition: 'background 0.3s ease, color 0.3s ease',
    }}>
      {/* BRAND MAGAZINE HEADER */}
      <header style={{
        borderBottom: `1px solid ${theme.border}`,
        paddingBottom: '2rem',
        marginBottom: '2.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1.5rem',
      }}>
        <div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.35rem 0.85rem',
            borderRadius: '100px',
            background: theme.badgeBg,
            border: `1px solid ${theme.accentCyan}40`,
            color: theme.badgeText,
            fontSize: '0.75rem',
            fontWeight: 800,
            letterSpacing: '2px',
            textTransform: 'uppercase',
            marginBottom: '0.75rem',
          }}>
            <Radio size={14} />
            Enterprise Edition • Brand Book Vol 1.0
          </div>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 900,
            letterSpacing: '2px',
            margin: 0,
            lineHeight: 1.1,
          }}>
            PLAYSTREAM
          </h1>
          <p style={{
            fontSize: '0.95rem',
            color: theme.textSecondary,
            marginTop: '0.35rem',
            letterSpacing: '4px',
            fontWeight: 700,
            textTransform: 'uppercase',
          }}>
            Action &amp; Sports Media Network Brand Guide
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* LIGHT / DARK MODE TOGGLE */}
          <button
            id="theme-toggle-btn"
            onClick={() => setIsLightMode(!isLightMode)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.25rem',
              borderRadius: '12px',
              border: `1px solid ${theme.border}`,
              background: theme.cardBg,
              color: theme.textPrimary,
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              transition: 'all 0.2s ease',
            }}
          >
            {isLightMode ? <Moon size={18} color="#2563EB" /> : <Sun size={18} color="#22D3EE" />}
            {isLightMode ? 'Dark Mode' : 'Light Mode'}
          </button>

          <a
            id="download-all-btn"
            href={`/play_stream_logo_transparent.svg${cacheBuster}`}
            download
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.25rem',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '0.875rem',
              textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(59, 130, 246, 0.3)',
            }}
          >
            <Download size={16} />
            Download Transparent Vector Package
          </a>
        </div>
      </header>

      {/* MAGAZINE TAB NAVIGATION */}
      <nav style={{
        display: 'flex',
        gap: '0.5rem',
        overflowX: 'auto',
        paddingBottom: '0.5rem',
        marginBottom: '3rem',
        borderBottom: `1px solid ${theme.border}`,
      }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.75rem 1.35rem',
                borderRadius: '12px',
                border: `1px solid ${isActive ? theme.accentCyan : theme.border}`,
                background: isActive ? theme.badgeBg : theme.cardBg,
                color: isActive ? theme.accentCyan : theme.textSecondary,
                fontWeight: isActive ? 800 : 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
              }}
            >
              <Icon size={16} color={isActive ? theme.accentCyan : theme.textSecondary} />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* SPREAD CONTENT VIEW */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            {/* HERO MAGAZINE COVER SPREAD */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: '2rem',
              marginBottom: '3rem',
              alignItems: 'stretch',
            }}>
              <div style={{
                background: theme.cardBg,
                border: `1px solid ${theme.border}`,
                borderRadius: '24px',
                padding: '2.5rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: isLightMode ? '0 10px 30px rgba(0,0,0,0.04)' : 'none',
              }}>
                <div>
                  <div style={{ color: theme.accentCobalt, fontSize: '0.85rem', fontWeight: 800, letterSpacing: '4px', textTransform: 'uppercase', marginBottom: '1rem' }}>
                    01 • BRAND STRATEGY
                  </div>
                  <h2 style={{ fontSize: '2.25rem', fontWeight: 900, lineHeight: 1.15, marginBottom: '1.25rem' }}>
                    The Next-Gen Action Media Network
                  </h2>
                  <p style={{ color: theme.textSecondary, fontSize: '1rem', lineHeight: 1.6, marginBottom: '1.75rem' }}>
                    Engineered for high-impact sports broadcasting, PLAYSTREAM fuses autonomous 4K AI camera tracking with stadium-grade visual authority and viral social highlight delivery.
                  </p>

                  <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
                    <div style={{ background: theme.innerCardBg, padding: '1.25rem', borderRadius: '16px', borderLeft: `4px solid ${theme.accentCyan}` }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: theme.accentCyan, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                        VISION STATEMENT
                      </div>
                      <p style={{ fontSize: '0.925rem', color: theme.textPrimary, margin: 0, fontStyle: 'italic' }}>
                        "To redefine sports &amp; action media by merging 4K AI camera technology with stadium-grade live coverage and viral digital storytelling."
                      </p>
                    </div>

                    <div style={{ background: theme.innerCardBg, padding: '1.25rem', borderRadius: '16px', borderLeft: `4px solid ${theme.accentCobalt}` }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: theme.accentCobalt, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                        MISSION STATEMENT
                      </div>
                      <p style={{ fontSize: '0.925rem', color: theme.textPrimary, margin: 0, fontStyle: 'italic' }}>
                        "To deliver stadium-quality multi-platform broadcasts, highlights, and production coverage that elevates athletes and sports programs globally."
                      </p>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1.5rem', borderTop: `1px solid ${theme.border}`, paddingTop: '1.25rem' }}>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: theme.accentCyan }}>4K 60fps</div>
                    <div style={{ fontSize: '0.75rem', color: theme.textSecondary, fontWeight: 600 }}>Stream Quality</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: theme.textPrimary }}>AI 360°</div>
                    <div style={{ fontSize: '0.75rem', color: theme.textSecondary, fontWeight: 600 }}>XBotGo Tracking</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: theme.accentCobalt }}>100%</div>
                    <div style={{ fontSize: '0.75rem', color: theme.textSecondary, fontWeight: 600 }}>Vector Precision</div>
                  </div>
                </div>
              </div>

              <div style={{
                borderRadius: '24px',
                overflow: 'hidden',
                position: 'relative',
                minHeight: '400px',
                border: `1px solid ${theme.border}`,
                boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              }}>
                <img
                  src={`/playstream_studio_control_room_mockup_1786021105397.jpg${cacheBuster}`}
                  alt="Broadcast Control Room"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(4,7,17,0.9), transparent 60%)',
                  padding: '2rem',
                  display: 'flex',
                  alignItems: 'flex-end',
                }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#22D3EE', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                      PRODUCTION SUITE MOCKUP
                    </div>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                      Master Broadcast Control Room
                    </h3>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'showcase' && (
          <motion.div
            key="showcase"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            {/* EDITORIAL MOCKUP SPREADS GRID (7 MOCKUPS) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '2rem' }}>
              {editorialMockups.map((m) => (
                <div key={m.id} style={{ background: theme.cardBg, borderRadius: '24px', overflow: 'hidden', border: `1px solid ${theme.border}` }}>
                  <div style={{ height: '320px', overflow: 'hidden' }}>
                    <img src={`${m.img}${cacheBuster}`} alt={m.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ padding: '1.75rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: m.color, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                      {m.num} • {m.cat}
                    </div>
                    <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.5rem' }}>{m.title}</h3>
                    <p style={{ color: theme.textSecondary, fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>
                      {m.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'logos' && (
          <motion.div
            key="logos"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            {/* FULL LIVE VECTOR SVG & TRANSPARENT LOGO SYSTEM GRID */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '2rem' }}>
              {vectorAssets.map((asset) => (
                <div key={asset.id} style={{ background: theme.cardBg, padding: '2rem', borderRadius: '24px', border: `1px solid ${theme.border}` }}>
                  <div style={{
                    background: asset.id.includes('dark') ? '#F8FAFC' : '#040711',
                    padding: '2rem',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1.25rem',
                    height: '180px',
                    position: 'relative',
                  }}>
                    <span style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      color: asset.id.includes('dark') ? '#0F172A' : '#22D3EE',
                      background: asset.id.includes('dark') ? 'rgba(15,23,42,0.1)' : 'rgba(34,211,238,0.15)',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '100px',
                      letterSpacing: '1px',
                    }}>
                      {asset.badge}
                    </span>
                    <img
                      id={`img-${asset.id}`}
                      src={`${asset.svg}${cacheBuster}`}
                      alt={asset.title}
                      style={{ maxWidth: '100%', maxHeight: '140px', objectFit: 'contain' }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ margin: 0, fontWeight: 800, fontSize: '1.05rem' }}>{asset.title}</h4>
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: theme.textSecondary }}>{asset.dims}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <a id={`download-svg-${asset.id}`} href={`${asset.svg}${cacheBuster}`} download style={{ padding: '0.45rem 0.85rem', background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', color: '#FFF', borderRadius: '8px', textDecoration: 'none', fontWeight: 800, fontSize: '0.75rem' }}>SVG</a>
                      <a id={`download-png-${asset.id}`} href={`${asset.png}${cacheBuster}`} download style={{ padding: '0.45rem 0.85rem', background: 'rgba(255,255,255,0.1)', color: theme.textPrimary, border: `1px solid ${theme.border}`, borderRadius: '8px', textDecoration: 'none', fontWeight: 800, fontSize: '0.75rem' }}>PNG</a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'color-type' && (
          <motion.div
            key="color-type"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            {/* COLOR MATRIX SPREAD */}
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>Enterprise Color Architecture</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '3rem' }}>
              {[
                { name: 'Deep Onyx', hex: '#080C14', use: 'Main Canvas' },
                { name: 'Midnight Slate', hex: '#0F172A', use: 'Studio Cards' },
                { name: 'Electric Cobalt', hex: '#2563EB', use: 'Shield Stroke' },
                { name: 'Hyper Cyan', hex: '#22D3EE', use: 'Wi-Fi Signal' },
                { name: 'Titanium White', hex: '#FFFFFF', use: 'Title Text' },
              ].map((c) => (
                <div
                  key={c.hex}
                  onClick={() => copyToClipboard(c.hex, c.name)}
                  style={{
                    background: theme.cardBg,
                    padding: '1.25rem',
                    borderRadius: '16px',
                    border: `1px solid ${theme.border}`,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ height: '80px', background: c.hex, borderRadius: '10px', marginBottom: '0.75rem', border: '1px solid rgba(255,255,255,0.1)' }} />
                  <div style={{ fontWeight: 800, fontSize: '1rem' }}>{c.name}</div>
                  <div style={{ fontSize: '0.8rem', color: theme.textSecondary, fontFamily: 'monospace' }}>{c.hex}</div>
                  <div style={{ fontSize: '0.75rem', color: theme.textSecondary, opacity: 0.8, marginTop: '0.25rem' }}>{c.use}</div>
                  {copiedHex === c.name && <div style={{ fontSize: '0.7rem', color: theme.accentCyan, fontWeight: 700, marginTop: '0.25rem' }}>COPIED!</div>}
                </div>
              ))}
            </div>

            {/* DOs & DON'Ts RULES */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
              <div style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '20px', padding: '1.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#4ADE80', fontWeight: 800, fontSize: '1.1rem', marginBottom: '1rem' }}>
                  <CheckCircle size={20} />
                  COLOR &amp; TYPE DOs
                </div>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', color: theme.textPrimary, fontSize: '0.9rem', lineHeight: 1.6 }}>
                  <li>Use single-word PLAYSTREAM in 100% solid white (#FFFFFF) on dark backgrounds or solid slate (#0F172A) on light backgrounds.</li>
                  <li>Use thick-stroked rounded play delta triangle emblem (#2563EB to #22D3EE gradient).</li>
                  <li>Use tracked uppercase (letter-spacing: 10px) for all network subtitles.</li>
                </ul>
              </div>

              <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '20px', padding: '1.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#F87171', fontWeight: 800, fontSize: '1.1rem', marginBottom: '1rem' }}>
                  <XCircle size={20} />
                  COLOR &amp; TYPE DON'Ts
                </div>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', color: theme.textPrimary, fontSize: '0.9rem', lineHeight: 1.6 }}>
                  <li>Never split font colors within the word PLAYSTREAM (do not use blue PLAY + cyan STREAM text split).</li>
                  <li>Never place dark blue text on dark slate backgrounds.</li>
                  <li>Never mix warm muddy colors (brown, beige, neon magenta clutter).</li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 5: OFFICIAL YOUTUBE STUDIO SPECIFICATIONS & OBS PLAYBOOK */}
        {activeTab === 'playbook' && (
          <motion.div
            key="playbook"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            <div style={{ background: theme.cardBg, padding: '2.5rem', borderRadius: '24px', border: `1px solid ${theme.border}`, marginBottom: '3rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <div style={{ color: theme.accentCyan, fontSize: '0.8rem', fontWeight: 800, letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                    05 • YOUTUBE STUDIO CUSTOMIZATION SPECIFICATIONS
                  </div>
                  <h3 style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0 }}>Official YouTube Channel &amp; OBS Setup Guide</h3>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: theme.innerCardBg, padding: '0.5rem 1rem', borderRadius: '12px', border: `1px solid ${theme.border}` }}>
                  <Mail size={16} color={theme.accentCyan} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Contact: admin@f1rstposition.com</span>
                </div>
              </div>

              {/* 3 YOUTUBE STUDIO SPEC CARDS MATCHED TO USER SCREENSHOTS */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <div style={{ background: theme.innerCardBg, padding: '1.75rem', borderRadius: '20px', border: `1px solid ${theme.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ color: theme.accentCyan, margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>1. Banner Image</h4>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, background: 'rgba(34,211,238,0.15)', color: theme.accentCyan, padding: '0.2rem 0.6rem', borderRadius: '100px' }}>&lt; 6 MB</span>
                  </div>
                  <p style={{ color: theme.textSecondary, fontSize: '0.875rem', lineHeight: 1.6, margin: '0 0 1.25rem' }}>
                    <strong>Requirement:</strong> Min <code style={{ color: theme.textPrimary }}>2048 × 1152 px</code> (&lt; 6MB).<br />
                    <strong>Our Asset:</strong> <code style={{ color: theme.accentCyan }}>play_stream_banner.png</code> (<strong>2560 × 1440 px, 560 KB</strong>). Perfectly centered for 1546×423 mobile safe zone.
                  </p>
                  <a href="/play_stream_banner.png?v=1786021480" download style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.1rem', background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', color: '#FFF', borderRadius: '10px', textDecoration: 'none', fontWeight: 800, fontSize: '0.8rem' }}>
                    <Download size={14} /> Download YouTube 4K Banner PNG
                  </a>
                </div>

                <div style={{ background: theme.innerCardBg, padding: '1.75rem', borderRadius: '20px', border: `1px solid ${theme.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ color: theme.accentCobalt, margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>2. Profile Picture (Avatar)</h4>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, background: 'rgba(59,130,246,0.15)', color: theme.accentCobalt, padding: '0.2rem 0.6rem', borderRadius: '100px' }}>&lt; 4 MB</span>
                  </div>
                  <p style={{ color: theme.textSecondary, fontSize: '0.875rem', lineHeight: 1.6, margin: '0 0 1.25rem' }}>
                    <strong>Requirement:</strong> Min <code style={{ color: theme.textPrimary }}>98 × 98 px</code> PNG (&lt; 4MB).<br />
                    <strong>Our Asset:</strong> <code style={{ color: theme.accentCobalt }}>play_stream_avatar.png</code> (<strong>1600 × 1600 px, 279 KB</strong>). High-res crisp retina icon.
                  </p>
                  <a href="/play_stream_avatar.png?v=1786021480" download style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.1rem', background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', color: '#FFF', borderRadius: '10px', textDecoration: 'none', fontWeight: 800, fontSize: '0.8rem' }}>
                    <Download size={14} /> Download YouTube Profile Avatar PNG
                  </a>
                </div>

                <div style={{ background: theme.innerCardBg, padding: '1.75rem', borderRadius: '20px', border: `1px solid ${theme.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ color: '#4ADE80', margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>3. Video Watermark</h4>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, background: 'rgba(74,222,128,0.15)', color: '#4ADE80', padding: '0.2rem 0.6rem', borderRadius: '100px' }}>&lt; 1 MB</span>
                  </div>
                  <p style={{ color: theme.textSecondary, fontSize: '0.875rem', lineHeight: 1.6, margin: '0 0 1.25rem' }}>
                    <strong>Requirement:</strong> 1:1 Square <code style={{ color: theme.textPrimary }}>150 × 150 px</code> (&lt; 1MB).<br />
                    <strong>Our Asset:</strong> <code style={{ color: '#4ADE80' }}>play_stream_youtube_watermark.png</code> (<strong>512 × 512 px 1:1, 40 KB</strong>). Dedicated YouTube Studio spec.
                  </p>
                  <a href="/play_stream_youtube_watermark.png?v=1786021480" download style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.1rem', background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', color: '#FFF', borderRadius: '10px', textDecoration: 'none', fontWeight: 800, fontSize: '0.8rem' }}>
                    <Download size={14} /> Download 1:1 Video Watermark PNG
                  </a>
                </div>
              </div>

              {/* YOUTUBE STUDIO ADVANCED SETTINGS CHEATSHEET */}
              <div style={{ background: theme.innerCardBg, padding: '1.75rem', borderRadius: '20px', border: `1px solid ${theme.border}` }}>
                <h4 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 800, color: theme.textPrimary }}>YouTube Studio Advanced Settings &amp; Defaults</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', fontSize: '0.875rem', color: theme.textSecondary }}>
                  <div><strong>License:</strong> Standard YouTube License</div>
                  <div><strong>Automatic Chapters:</strong> Allow automatic chapters and key moments</div>
                  <div><strong>Category:</strong> Sports / Media Network</div>
                  <div><strong>Video Watermark Display:</strong> Entire Video (Right-hand corner)</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 6: ANTI-PIRACY & DRM BROADCAST SECURITY SUITE */}
        {activeTab === 'security' && (
          <motion.div
            key="security"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            {/* LIVE INTERACTIVE STREAM WATERMARK PLAYER */}
            <div style={{ background: theme.cardBg, padding: '2.5rem', borderRadius: '24px', border: `1px solid ${theme.border}`, marginBottom: '3rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <div style={{ color: theme.accentCyan, fontSize: '0.8rem', fontWeight: 800, letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                    06.1 • INTERACTIVE SECURITY SUITE
                  </div>
                  <h3 style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0 }}>Dynamic Live Broadcast Watermarking Engine</h3>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <button
                    onClick={() => setEnableForensic(!enableForensic)}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '10px',
                      background: enableForensic ? 'rgba(34, 211, 238, 0.15)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${enableForensic ? theme.accentCyan : theme.border}`,
                      color: enableForensic ? theme.accentCyan : theme.textSecondary,
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                    }}
                  >
                    {enableForensic ? '✓ Forensic Session Drift Active' : 'Enable Forensic Watermark'}
                  </button>
                </div>
              </div>

              {/* LIVE SIMULATED VIDEO PLAYER WITH FORENSIC WATERMARK OVERLAY */}
              <div style={{
                position: 'relative',
                borderRadius: '20px',
                overflow: 'hidden',
                height: '460px',
                border: `1px solid ${theme.border}`,
                background: '#040711',
                boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
              }}>
                <img
                  src="/playstream_stadium_jumbotron_mockup_1786022790814.jpg"
                  alt="Live Stream Feed"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />

                {/* DYNAMIC FORENSIC WATERMARK OVERLAY */}
                <DynamicWatermarkOverlay viewerId={simulatedViewer} showForensic={enableForensic} />

                {/* BROADCAST LOWER THIRD GRAPHIC */}
                <div style={{ position: 'absolute', bottom: '20px', left: '20px', right: '20px', pointerEvents: 'none' }}>
                  <img src="/play_stream_lower_third.svg" alt="Lower Third" style={{ height: '80px', maxWidth: '100%', objectFit: 'contain' }} />
                </div>
              </div>
            </div>

            {/* 4 BROADCAST SECURITY SPECIFICATION CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
              <div style={{ background: theme.cardBg, padding: '2rem', borderRadius: '24px', border: `1px solid ${theme.border}` }}>
                <div style={{ color: theme.accentCyan, display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '1.1rem', marginBottom: '1rem' }}>
                  <Eye size={20} />
                  1. Dynamic Forensic Steno-Marking
                </div>
                <p style={{ color: theme.textSecondary, fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                  Injects randomized, drifting viewer session tokens (<code style={{ color: theme.accentCyan }}>USER-8921-AZ9</code>) directly into video frames. If pirates re-stream your broadcast, their unique account ID is captured on video, prompting instant DMCA takedowns.
                </p>
              </div>

              <div style={{ background: theme.cardBg, padding: '2rem', borderRadius: '24px', border: `1px solid ${theme.border}` }}>
                <div style={{ color: theme.accentCobalt, display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '1.1rem', marginBottom: '1rem' }}>
                  <Zap size={20} />
                  2. Anti-AI Micro-Jitter &amp; Opacity Pulse
                </div>
                <p style={{ color: theme.textSecondary, fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                  Applies randomized 2-pixel micro-jitter and 5% opacity pulsing to corner logos. Defeats AI watermark-remover tools which rely on static pixel masks to erase overlays.
                </p>
              </div>

              <div style={{ background: theme.cardBg, padding: '2rem', borderRadius: '24px', border: `1px solid ${theme.border}` }}>
                <div style={{ color: '#4ADE80', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '1.1rem', marginBottom: '1rem' }}>
                  <Lock size={20} />
                  3. AES-128 HLS &amp; DRM Stream Encryption
                </div>
                <p style={{ color: theme.textSecondary, fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                  Encrypts live HLS <code style={{ color: theme.textPrimary }}>.m3u8</code> video chunks with short-lived AES-128 tokens. Blocks direct video URL ripping, web scraping, and third-party IPTV grabbers.
                </p>
              </div>

              <div style={{ background: theme.cardBg, padding: '2rem', borderRadius: '24px', border: `1px solid ${theme.border}` }}>
                <div style={{ color: '#F43F5E', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '1.1rem', marginBottom: '1rem' }}>
                  <Shield size={20} />
                  4. Automated Content ID Fingerprinting
                </div>
                <p style={{ color: theme.textSecondary, fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                  Registers live audio &amp; video waveforms with YouTube Content ID and Meta Rights Manager. Scans social platforms continuously and issues automatic channel copyright strikes within seconds.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
