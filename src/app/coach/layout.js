'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/ui/Sidebar';
import { getUserWithProfile, signOut, isCoach } from '@/lib/supabase';

export default function CoachLayout({ children }) {
  const [profile, setProfile] = useState(null);
  const [sidebarWidth, setSidebarWidth] = useState(260);
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

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar
        role="coach"
        orgName="Delray Rocks"
        userName={profile ? `${profile.first_name} ${profile.last_name}` : 'Coach'}
        onSignOut={handleSignOut}
      />
      <main style={{
        flex: 1,
        marginLeft: 260,
        padding: '2rem',
        minHeight: '100vh',
        transition: 'margin-left 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        {children}
      </main>
    </div>
  );
}
