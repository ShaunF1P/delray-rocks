'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/ui/Sidebar';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { getUserWithProfile, signOut, isCoach } from '@/lib/supabase';

export default function CoachLayout({ children }) {
  const [profile, setProfile] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function loadProfile() {
      const { user, profile } = await getUserWithProfile();
      if (!user || !profile || !isCoach(profile)) {
        router.push('/login');
        return;
      }
      setProfile(profile);
    }
    loadProfile();
  }, [router]);

  // Track mobile state to remove sidebar margin
  useEffect(() => {
    function checkMobile() {
      setIsMobile(window.innerWidth <= 768);
    }
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  async function handleSignOut() {
    await signOut();
    router.push('/login');
  }

  // On mobile, no margin needed (sidebar is an overlay)
  const marginLeft = isMobile ? 0 : (sidebarCollapsed ? 72 : 260);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar
        role="coach"
        orgName="Delray Rocks"
        userName={profile ? `${profile.first_name} ${profile.last_name}` : 'Coach'}
        onSignOut={handleSignOut}
        onCollapse={(collapsed) => setSidebarCollapsed(collapsed)}
      />
      <main style={{
        flex: 1,
        marginLeft: marginLeft,
        padding: isMobile ? '3.5rem 0.75rem 1rem' : '1.5rem',
        minHeight: '100vh',
        transition: 'margin-left 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        width: isMobile ? '100%' : `calc(100vw - ${marginLeft}px)`,
        maxWidth: '100%',
        overflowX: 'hidden',
      }}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>
    </div>
  );
}
