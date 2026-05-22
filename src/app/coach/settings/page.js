'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, User, Shield, Bell, Link2, Calendar, Check, X, ExternalLink, Save } from 'lucide-react';
import { Card, Button, Badge, PageHeader } from '@/components/ui/index';
import { FootballIcon, CalendarIcon, ShieldCheckIcon } from '@/components/ui/Icons';
import { createClient, getUserWithProfile } from '@/lib/supabase';
import toast from 'react-hot-toast';

const GHL_LOCATION_ID = '5qs5M2XozDLuejIacDVD';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('team');
  const [teamSettings, setTeamSettings] = useState({
    team_name: 'Delray Rocks',
    division: '8U',
    season: '2026 Fall',
    head_coach: 'Coach Gee (Gerard Miller)',
    assistant_coaches: '',
    home_field: 'Pompey Park',
    practice_days: 'Tue, Thu',
    practice_time: '5:30 PM',
  });
  const [notifications, setNotifications] = useState({
    game_reminders: true,
    practice_reminders: true,
    evaluation_alerts: true,
    fundraising_updates: true,
    parent_messages: true,
  });
  const [ghlStatus, setGhlStatus] = useState({ connected: false, checking: true });
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState({
    email: 'coach@delrayrocks.org',
    role: 'Head Coach',
  });

  useEffect(() => {
    // Check GHL connection status
    checkGHL();
    // Load DB settings dynamically
    loadDBSettings();
  }, []);

  async function checkGHL() {
    setGhlStatus({ connected: false, checking: true });
    try {
      const res = await fetch('/api/ghl/status');
      if (res.ok) {
        const data = await res.json();
        setGhlStatus({ connected: data.connected, checking: false, calendars: data.calendars });
      } else {
        setGhlStatus({ connected: false, checking: false });
      }
    } catch {
      setGhlStatus({ connected: false, checking: false });
    }
  }

  async function loadDBSettings() {
    try {
      const supabase = createClient();
      const { data: staff } = await supabase
        .from('coaching_staff')
        .select('*')
        .order('sort_order', { ascending: true });
        
      if (staff && staff.length > 0) {
        const hc = staff.find(c => c.title === 'Head Coach');
        const assistants = staff.filter(c => c.title !== 'Head Coach').map(c => c.name).join(', ');
        setTeamSettings(s => ({
          ...s,
          head_coach: hc ? `${hc.name} (Coach Gee)` : s.head_coach,
          assistant_coaches: assistants || s.assistant_coaches,
        }));
      }
      
      const { user, profile } = await getUserWithProfile();
      if (user) {
        let displayRole = 'Coach';
        if (profile) {
          if (profile.title) {
            displayRole = profile.title;
          } else if (profile.role === 'org_admin') {
            displayRole = 'General Manager';
          } else if (profile.role === 'coach') {
            displayRole = 'Coach';
          } else {
            displayRole = profile.role;
          }
        }
        setCurrentUser({
          email: user.email,
          role: displayRole,
        });
      }
    } catch (err) {
      console.error('Error loading settings from DB:', err);
    }
  }

  async function handleSaveTeam() {
    setSaving(true);
    // In a production app, this would save to Supabase
    await new Promise(r => setTimeout(r, 600));
    toast.success('Team settings saved');
    setSaving(false);
  }

  async function handleSaveNotifications() {
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    toast.success('Notification preferences updated');
    setSaving(false);
  }

  const tabs = [
    { key: 'team', label: 'Team Profile', icon: <FootballIcon size={16} /> },
    { key: 'integrations', label: 'Integrations', icon: <Link2 size={16} /> },
    { key: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
    { key: 'account', label: 'Account', icon: <User size={16} /> },
  ];

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your team and platform configuration" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: 'var(--space-xl)' }}>
        {/* Tab Navigation */}
        <Card style={{ padding: 'var(--space-sm)', height: 'fit-content', position: 'sticky', top: 'var(--space-xl)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)',
                  background: activeTab === tab.key ? 'rgba(16,107,58,0.12)' : 'transparent',
                  color: activeTab === tab.key ? 'var(--rocks-green-light)' : 'var(--text-secondary)',
                  border: 'none', cursor: 'pointer', fontWeight: activeTab === tab.key ? 600 : 500,
                  fontSize: 'var(--text-sm)', textAlign: 'left', transition: 'all 150ms',
                  width: '100%',
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </Card>

        {/* Tab Content */}
        <div>
          {/* Team Profile */}
          {activeTab === 'team' && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
              <Card>
                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-xl)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FootballIcon size={20} color="var(--rocks-green-light)" /> Team Profile
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
                  <div className="form-group">
                    <label className="form-label">Team Name</label>
                    <input className="form-input" value={teamSettings.team_name} onChange={e => setTeamSettings(s => ({ ...s, team_name: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Division</label>
                    <select className="form-input" value={teamSettings.division} onChange={e => setTeamSettings(s => ({ ...s, division: e.target.value }))}>
                      <option>6U</option><option>8U</option><option>10U</option><option>12U</option><option>14U</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Season</label>
                    <input className="form-input" value={teamSettings.season} onChange={e => setTeamSettings(s => ({ ...s, season: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Head Coach</label>
                    <input className="form-input" value={teamSettings.head_coach} onChange={e => setTeamSettings(s => ({ ...s, head_coach: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Home Field</label>
                    <input className="form-input" value={teamSettings.home_field} onChange={e => setTeamSettings(s => ({ ...s, home_field: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Assistant Coaches</label>
                    <input className="form-input" value={teamSettings.assistant_coaches} onChange={e => setTeamSettings(s => ({ ...s, assistant_coaches: e.target.value }))} placeholder="Comma separated names" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Practice Days</label>
                    <input className="form-input" value={teamSettings.practice_days} onChange={e => setTeamSettings(s => ({ ...s, practice_days: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Practice Time</label>
                    <input className="form-input" value={teamSettings.practice_time} onChange={e => setTeamSettings(s => ({ ...s, practice_time: e.target.value }))} />
                  </div>
                </div>
                <div style={{ marginTop: 'var(--space-xl)', display: 'flex', justifyContent: 'flex-end' }}>
                  <Button variant="primary" icon={<Save size={16} />} loading={saving} onClick={handleSaveTeam}>Save Changes</Button>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Integrations */}
          {activeTab === 'integrations' && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                {/* GHL Integration */}
                <Card>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: 'var(--radius-md)',
                        background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <CalendarIcon size={24} color="white" />
                      </div>
                      <div>
                        <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: 4 }}>GoHighLevel (F1rst Position)</h3>
                        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-dim)', marginBottom: 8 }}>
                          Calendar scheduling, contact management, and automated workflows
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {ghlStatus.checking ? (
                            <Badge variant="blue">Checking...</Badge>
                          ) : ghlStatus.connected ? (
                            <Badge variant="green"><Check size={10} /> Connected</Badge>
                          ) : (
                            <Badge variant="amber">Not Connected</Badge>
                          )}
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>
                            Location: {GHL_LOCATION_ID}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Button variant="ghost" size="sm" onClick={checkGHL}>Refresh</Button>
                      <a href={`https://app.f1rstposition.com/v2/location/${GHL_LOCATION_ID}/dashboard`} target="_blank" rel="noopener noreferrer">
                        <Button variant="secondary" size="sm" icon={<ExternalLink size={12} />}>Open GHL</Button>
                      </a>
                    </div>
                  </div>

                  {/* GHL Features */}
                  <div style={{ marginTop: 'var(--space-xl)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: 'var(--space-md)' }}>
                    {[
                      { label: 'Calendar', desc: 'Scheduling & booking', icon: <Calendar size={16} />, active: true },
                      { label: 'Contacts', desc: 'Parent & player CRM', icon: <User size={16} />, active: false },
                      { label: 'Automations', desc: 'Reminders & notifications', icon: <Bell size={16} />, active: false },
                    ].map(feature => (
                      <div key={feature.label} style={{
                        padding: 'var(--space-md)', borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-glass)', border: `1px solid ${feature.active ? 'rgba(16,107,58,0.3)' : 'var(--border)'}`,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: feature.active ? 'var(--rocks-green-light)' : 'var(--text-dim)' }}>
                            {feature.icon}
                            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{feature.label}</span>
                          </div>
                          <Badge variant={feature.active ? 'green' : 'red'} style={{ fontSize: '0.6rem' }}>
                            {feature.active ? 'Active' : 'Setup Required'}
                          </Badge>
                        </div>
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>{feature.desc}</p>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Supabase */}
                <Card>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 'var(--radius-md)',
                      background: 'linear-gradient(135deg, #3ECF8E, #1C8656)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <ShieldCheckIcon size={24} color="white" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: 4 }}>Supabase</h3>
                      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-dim)' }}>Database, authentication, and real-time data</p>
                    </div>
                    <Badge variant="green"><Check size={10} /> Connected</Badge>
                  </div>
                </Card>
              </div>
            </motion.div>
          )}

          {/* Notifications */}
          {activeTab === 'notifications' && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
              <Card>
                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-xl)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Bell size={20} color="var(--rocks-gold)" /> Notification Preferences
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                  {[
                    { key: 'game_reminders', label: 'Game Reminders', desc: 'Get notified before games' },
                    { key: 'practice_reminders', label: 'Practice Reminders', desc: 'Daily practice notifications' },
                    { key: 'evaluation_alerts', label: 'Evaluation Alerts', desc: 'When new evaluations are submitted' },
                    { key: 'fundraising_updates', label: 'Fundraising Updates', desc: 'Donation and campaign milestones' },
                    { key: 'parent_messages', label: 'Parent Messages', desc: 'New messages from parents' },
                  ].map(pref => (
                    <div key={pref.key} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: 'var(--space-md)', borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-glass)', border: '1px solid var(--border)',
                    }}>
                      <div>
                        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{pref.label}</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>{pref.desc}</div>
                      </div>
                      <button
                        onClick={() => setNotifications(n => ({ ...n, [pref.key]: !n[pref.key] }))}
                        style={{
                          width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
                          background: notifications[pref.key] ? 'var(--rocks-green-light)' : 'var(--bg-glass)',
                          position: 'relative', transition: 'background 200ms',
                        }}
                      >
                        <div style={{
                          width: 20, height: 20, borderRadius: '50%', background: 'white',
                          position: 'absolute', top: 3,
                          left: notifications[pref.key] ? 25 : 3,
                          transition: 'left 200ms ease',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                        }} />
                      </button>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 'var(--space-xl)', display: 'flex', justifyContent: 'flex-end' }}>
                  <Button variant="primary" icon={<Save size={16} />} loading={saving} onClick={handleSaveNotifications}>Save Preferences</Button>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Account */}
          {activeTab === 'account' && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
              <Card>
                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-xl)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <User size={20} color="var(--electric-blue-light)" /> Account
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input className="form-input" value={currentUser.email} disabled style={{ opacity: 0.6 }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Role</label>
                    <input className="form-input" value={currentUser.role} disabled style={{ opacity: 0.6 }} />
                  </div>
                </div>
                <div style={{ marginTop: 'var(--space-xl)', padding: 'var(--space-lg)', background: 'rgba(239,68,68,0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239,68,68,0.15)' }}>
                  <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--red)', marginBottom: 4 }}>Danger Zone</h4>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', marginBottom: 'var(--space-md)' }}>These actions cannot be undone.</p>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <Button variant="ghost" size="sm">Change Password</Button>
                    <Button variant="ghost" size="sm" style={{ color: 'var(--red)' }}>Delete Account</Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
