'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/ui/Sidebar';
import { getUserWithProfile, signOut, isCoach } from '@/lib/supabase';

export default function CoachLayout({ children }) {
  const [profile, setProfile] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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

  async function handleSignOut() {
    await signOut();
    router.push('/login');
  }

  const marginLeft = sidebarCollapsed ? 72 : 260;

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
        padding: '1.5rem',
        minHeight: '100vh',
        transition: 'margin-left 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        maxWidth: `calc(100vw - ${marginLeft}px)`,
        overflow: 'hidden',
      }}>
        {children}
      </main>
    </div>
  );
}
