'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getUserWithProfile, signOut, isGuardian } from '@/lib/supabase';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Home, TrendingUp, FileText, LogOut, User, Shield } from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/parent/dashboard', icon: Home },
  { label: 'Progress', href: '/parent/progress', icon: TrendingUp },
  { label: 'Reports', href: '/parent/reports', icon: FileText },
];

export default function ParentLayout({ children }) {
  const [profile, setProfile] = useState(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function loadProfile() {
      const { user, profile } = await getUserWithProfile();
      if (!user || !profile || !isGuardian(profile)) {
        router.push('/login');
        return;
      }
      setProfile(profile);
    }
    loadProfile();
  }, [router]);

  async function handleSignOut() {
    await signOut();
    router.push('/login');
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <nav style={{
        width: 240, minHeight: '100vh', padding: '20px 12px',
        background: 'linear-gradient(180deg, #0d1117 0%, #0a0e16 100%)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0,
      }}>
        {/* Brand */}
        <div style={{ padding: '4px 8px', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={20} color="#009A44" />
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>Delray Rocks</div>
              <div style={{ fontSize: 10, color: '#FDB913', fontWeight: 600 }}>Parent Portal</div>
            </div>
          </div>
        </div>

        {/* Nav Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
          {NAV_ITEMS.map(item => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 600,
                background: isActive ? 'rgba(0,154,68,0.15)' : 'transparent',
                color: isActive ? '#4ADE80' : 'rgba(255,255,255,0.5)',
                border: isActive ? '1px solid rgba(0,154,68,0.2)' : '1px solid transparent',
                transition: 'all 150ms ease',
              }}>
                <item.icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* User */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 8px', marginBottom: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,154,68,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <User size={14} color="#4ADE80" />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>
                {profile ? `${profile.first_name} ${profile.last_name}` : 'Parent'}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Guardian</div>
            </div>
          </div>
          <button onClick={handleSignOut} style={{
            width: '100%', padding: '8px 12px', fontSize: 12, fontWeight: 600, borderRadius: 6,
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)',
            color: '#EF4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </nav>

      {/* Main */}
      <main style={{
        flex: 1, marginLeft: 240, padding: '1.5rem', minHeight: '100vh',
        maxWidth: 'calc(100vw - 240px)', overflow: 'hidden',
      }}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>
    </div>
  );
}
