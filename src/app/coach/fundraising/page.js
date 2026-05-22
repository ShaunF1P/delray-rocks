'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, Plus, TrendingUp, Users, Calendar, Edit2, Trash2, Share2, ExternalLink } from 'lucide-react';
import { Card, Button, Badge, PageHeader, Modal, EmptyState } from '@/components/ui/index';
import { DollarIcon, TrophyIcon, CalendarIcon } from '@/components/ui/Icons';
import { createClient } from '@/lib/supabase';
import toast from 'react-hot-toast';

const CAMPAIGN_TYPES = [
  { value: 'general', label: 'General', color: 'green' },
  { value: 'equipment', label: 'Equipment', color: 'blue' },
  { value: 'travel', label: 'Travel', color: 'amber' },
  { value: 'event', label: 'Event', color: 'purple' },
  { value: 'scholarship', label: 'Scholarship', color: 'gold' },
];

export default function FundraisingPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showDonate, setShowDonate] = useState(null);
  const [form, setForm] = useState({
    name: '', description: '', goal_amount: '', campaign_type: 'general',
    start_date: new Date().toISOString().split('T')[0], end_date: '',
  });
  const [donationForm, setDonationForm] = useState({ donor_name: '', donor_email: '', amount: '', notes: '' });

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: camps }, { data: dons }] = await Promise.all([
      supabase.from('fundraising_campaigns').select('*').order('created_at', { ascending: false }),
      supabase.from('donations').select('*').order('donated_at', { ascending: false }).limit(20),
    ]);
    setCampaigns(camps || []);
    setDonations(dons || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e) {
    e.preventDefault();
    const supabase = createClient();
    const { error } = await supabase.from('fundraising_campaigns').insert({
      ...form,
      goal_amount: parseFloat(form.goal_amount) || 0,
      is_active: true,
      share_url: `https://delrayrocks.org/fundraise/${Date.now()}`,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Campaign created');
    setShowCreate(false);
    setForm({ name: '', description: '', goal_amount: '', campaign_type: 'general', start_date: new Date().toISOString().split('T')[0], end_date: '' });
    load();
  }

  async function handleDonation(e) {
    e.preventDefault();
    const supabase = createClient();
    const { error } = await supabase.from('donations').insert({
      campaign_id: showDonate,
      ...donationForm,
      amount: parseFloat(donationForm.amount),
    });
    if (error) { toast.error(error.message); return; }

    // Update raised amount
    const campaign = campaigns.find(c => c.id === showDonate);
    if (campaign) {
      await supabase.from('fundraising_campaigns').update({
        raised_amount: (parseFloat(campaign.raised_amount) || 0) + parseFloat(donationForm.amount),
      }).eq('id', showDonate);
    }

    toast.success('Donation recorded');
    setShowDonate(null);
    setDonationForm({ donor_name: '', donor_email: '', amount: '', notes: '' });
    load();
  }

  async function toggleActive(id, current) {
    const supabase = createClient();
    await supabase.from('fundraising_campaigns').update({ is_active: !current }).eq('id', id);
    toast.success(!current ? 'Campaign activated' : 'Campaign paused');
    load();
  }

  async function deleteCampaign(id) {
    const supabase = createClient();
    await supabase.from('fundraising_campaigns').delete().eq('id', id);
    toast.success('Campaign deleted');
    load();
  }

  const totalRaised = campaigns.reduce((sum, c) => sum + (parseFloat(c.raised_amount) || 0), 0);
  const totalGoal = campaigns.reduce((sum, c) => sum + (parseFloat(c.goal_amount) || 0), 0);
  const activeCampaigns = campaigns.filter(c => c.is_active);
  const overallProgress = totalGoal > 0 ? Math.round((totalRaised / totalGoal) * 100) : 0;

  return (
    <div>
      <PageHeader
        title="Fundraising"
        subtitle="Campaign management and donation tracking"
        actions={
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => setShowCreate(true)}>
            New Campaign
          </Button>
        }
      />

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
        {[
          { label: 'Total Raised', value: `$${totalRaised.toLocaleString()}`, color: 'var(--green)', icon: <DollarIcon size={20} /> },
          { label: 'Overall Goal', value: `$${totalGoal.toLocaleString()}`, color: 'var(--rocks-gold)', icon: <TrophyIcon size={20} /> },
          { label: 'Active Campaigns', value: activeCampaigns.length, color: 'var(--electric-blue-light)', icon: <TrendingUp size={20} /> },
          { label: 'Progress', value: `${overallProgress}%`, color: 'var(--teal)', icon: <CalendarIcon size={20} /> },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card style={{ padding: 'var(--space-lg)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: 'var(--space-sm)' }}>
                <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: `${stat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color }}>{stat.icon}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
              </div>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: stat.color }}>{stat.value}</div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Campaigns */}
      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-dim)' }}>Loading campaigns...</div>
      ) : campaigns.length === 0 ? (
        <EmptyState
          icon={<DollarSign size={48} />}
          title="No campaigns yet"
          description="Create your first fundraising campaign to start tracking donations."
          action={<Button variant="primary" icon={<Plus size={16} />} onClick={() => setShowCreate(true)}>Create Campaign</Button>}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          {campaigns.map((campaign, i) => {
            const progress = campaign.goal_amount > 0 ? Math.min(100, Math.round((parseFloat(campaign.raised_amount || 0) / parseFloat(campaign.goal_amount)) * 100)) : 0;
            const typeInfo = CAMPAIGN_TYPES.find(t => t.value === campaign.campaign_type) || CAMPAIGN_TYPES[0];
            const campaignDonations = donations.filter(d => d.campaign_id === campaign.id);

            return (
              <motion.div key={campaign.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <Card>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-lg)' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: 4 }}>
                        <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>{campaign.name}</h3>
                        <Badge variant={typeInfo.color}>{typeInfo.label}</Badge>
                        <Badge variant={campaign.is_active ? 'green' : 'red'}>{campaign.is_active ? 'Active' : 'Paused'}</Badge>
                      </div>
                      {campaign.description && (
                        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-dim)', maxWidth: 500 }}>{campaign.description}</p>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Button variant="primary" size="sm" icon={<Plus size={12} />} onClick={() => setShowDonate(campaign.id)}>Record Donation</Button>
                      <Button variant="ghost" size="sm" onClick={() => toggleActive(campaign.id, campaign.is_active)}>
                        {campaign.is_active ? 'Pause' : 'Activate'}
                      </Button>
                      <button onClick={() => deleteCampaign(campaign.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ marginBottom: 'var(--space-lg)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                      <span style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--green)' }}>${parseFloat(campaign.raised_amount || 0).toLocaleString()}</span>
                      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-dim)' }}>of ${parseFloat(campaign.goal_amount || 0).toLocaleString()} goal</span>
                    </div>
                    <div style={{ height: 8, background: 'var(--bg-glass)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                        style={{ height: '100%', background: progress >= 100 ? 'var(--rocks-gold)' : 'linear-gradient(90deg, #106B3A, #009A44)', borderRadius: 'var(--radius-full)' }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>
                      <span>{progress}% funded</span>
                      {campaign.end_date && <span>Ends {new Date(campaign.end_date).toLocaleDateString()}</span>}
                    </div>
                  </div>

                  {/* Recent Donations */}
                  {campaignDonations.length > 0 && (
                    <div>
                      <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-dim)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recent Donations</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {campaignDonations.slice(0, 3).map(d => (
                          <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-sm)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <Users size={14} color="var(--text-dim)" />
                              <span style={{ fontWeight: 600 }}>{d.donor_name}</span>
                            </div>
                            <span style={{ fontWeight: 700, color: 'var(--green)' }}>${parseFloat(d.amount).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create Campaign Modal */}
      <AnimatePresence>
        {showCreate && (
          <Modal onClose={() => setShowCreate(false)} title="New Fundraising Campaign">
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div className="form-group">
                <label className="form-label">Campaign Name *</label>
                <input className="form-input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="New Equipment Fund" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                <div className="form-group">
                  <label className="form-label">Goal Amount ($)</label>
                  <input className="form-input" type="number" step="0.01" value={form.goal_amount} onChange={e => setForm(f => ({ ...f, goal_amount: e.target.value }))} placeholder="5000" />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-input" value={form.campaign_type} onChange={e => setForm(f => ({ ...f, campaign_type: e.target.value }))}>
                    {CAMPAIGN_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input className="form-input" type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input className="form-input" type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-input" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Help us raise funds for..." />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: 'var(--space-md)' }}>
                <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button variant="primary" type="submit" icon={<Plus size={16} />}>Create Campaign</Button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>

      {/* Record Donation Modal */}
      <AnimatePresence>
        {showDonate && (
          <Modal onClose={() => setShowDonate(null)} title="Record Donation">
            <form onSubmit={handleDonation} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div className="form-group">
                <label className="form-label">Donor Name *</label>
                <input className="form-input" required value={donationForm.donor_name} onChange={e => setDonationForm(f => ({ ...f, donor_name: e.target.value }))} placeholder="John Smith" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                <div className="form-group">
                  <label className="form-label">Amount ($) *</label>
                  <input className="form-input" type="number" step="0.01" required value={donationForm.amount} onChange={e => setDonationForm(f => ({ ...f, amount: e.target.value }))} placeholder="50.00" />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" value={donationForm.donor_email} onChange={e => setDonationForm(f => ({ ...f, donor_email: e.target.value }))} placeholder="donor@email.com" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-input" rows={2} value={donationForm.notes} onChange={e => setDonationForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes..." />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: 'var(--space-md)' }}>
                <Button variant="ghost" onClick={() => setShowDonate(null)}>Cancel</Button>
                <Button variant="primary" type="submit" icon={<DollarSign size={16} />}>Record Donation</Button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
