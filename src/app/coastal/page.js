'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Phone, Check, Heart, Trophy, Info, ArrowRight, Calendar, MapPin, Sparkles, Clock, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from './page.module.css';

export default function CoastalLandingPage() {
  const [form, setForm] = useState({
    parent_first_name: '',
    parent_last_name: '',
    email: '',
    phone: '',
    player_name: '',
    text_opt_in: false,
    planned_visit: 'Unspecified',
  });

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Simple phone number formatter: (XXX) XXX-XXXX
  function handlePhoneChange(e) {
    const value = e.target.value.replace(/\D/g, '');
    let formatted = value;
    if (value.length > 3 && value.length <= 6) {
      formatted = `(${value.slice(0, 3)}) ${value.slice(3)}`;
    } else if (value.length > 6) {
      formatted = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6, 10)}`;
    }
    setForm((f) => ({ ...f, phone: formatted }));
  }

  async function onSubmit(e) {
    e.preventDefault();

    // Basic validation
    if (!form.parent_first_name.trim()) {
      toast.error("Please enter parent/guardian first name");
      return;
    }
    if (!form.parent_last_name.trim()) {
      toast.error("Please enter parent/guardian last name");
      return;
    }
    if (!form.email.trim() || !form.email.includes('@')) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (form.phone.replace(/\D/g, '').length !== 10) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }
    if (!form.player_name.trim()) {
      toast.error("Please enter the 8U player's name");
      return;
    }
    if (!form.text_opt_in) {
      toast.error("Please consent to text messages to proceed");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/coastal/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      setSubmitted(true);
      toast.success('Sign up successful!');
    } catch (err) {
      toast.error(err.message || 'Failed to submit form');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      {/* Background glow orbs */}
      <div className={styles.glowOrb1} />
      <div className={styles.glowOrb2} />

      <div className={styles.contentWrapper}>
        {/* Header Branding Logos */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className={styles.logoWrapper}
        >
          <img src="/dr-logo.jpg" alt="Delray Rocks Logo" className={styles.logo} />
          <div className={styles.logoDivider} />
          <img 
            src="https://coastalcommunity.tv/wp-content/uploads/2025/09/cropped-Untitled-design-8-4-192x192.png" 
            alt="Coastal Community Logo" 
            className={styles.churchLogo}
          />
        </motion.div>

        {/* Header Text */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className={styles.headerText}
        >
          <h1 className={styles.title}>
            Delray Rocks 8U & <br />
            <span className={styles.highlightText}>Coastal Community</span>
          </h1>
          <p className={styles.subtitle}>
            A joint initiative supporting our local community, checking out family events, and securing sponsorship funding for the 8U team.
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {!submitted ? (
            <motion.div
              key="signup-form"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className={styles.card}
            >
              {/* Sponsorship Notice */}
              <div className={styles.sponsorshipBanner}>
                <Trophy size={20} color="var(--rocks-gold)" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <h4 className={styles.sponsorshipTitle}>$500 Team Sponsorship</h4>
                  <p className={styles.sponsorshipDesc}>
                    When 8U player families sign up and check out a service or join us for the block party, the team receives a <strong>$500 sponsorship</strong> to support uniforms and bags.
                  </p>
                </div>
              </div>

              {/* Upcoming Featured Event: Block Party */}
              <div className={styles.eventCard}>
                <div className={styles.eventBadge}>This Sunday</div>
                <h4 className={styles.eventTitle}>
                  <Sparkles size={16} /> West Boca Campus Block Party
                </h4>
                <div className={styles.eventTimeLocation}>
                  <div className={styles.eventMetaItem}>
                    <Calendar size={14} color="var(--rocks-gold)" />
                    <span>Sunday at 12:30 PM</span>
                  </div>
                  <div className={styles.eventMetaItem}>
                    <MapPin size={14} color="var(--rocks-gold)" style={{ flexShrink: 0 }} />
                    <span style={{ textAlign: 'left' }}>Boca Prep (10333 Diego Drive S., Boca Raton, FL 33428)</span>
                  </div>
                </div>
                <p className={styles.eventDescription}>
                  Join us immediately following the 11:30 AM service for a community block party featuring fun games, water slides, and more!
                </p>
              </div>

              {/* Sunday Services Schedule */}
              <div className={styles.servicesSection}>
                <h5 className={styles.servicesTitle}>
                  <Clock size={14} /> Sunday Service Times
                </h5>
                <div className={styles.servicesGrid}>
                  <div className={styles.serviceCard}>
                    <div className={styles.serviceCampus}>West Boca (Boca Prep)</div>
                    <div className={styles.serviceTime}>10:00 AM</div>
                    <div className={styles.serviceInfo}>In-Person</div>
                  </div>
                  <div className={styles.serviceCard}>
                    <div className={styles.serviceCampus}>West Boca (Boca Prep)</div>
                    <div className={styles.serviceTime}>11:30 AM</div>
                    <div className={styles.serviceInfo}>In-Person & Live</div>
                  </div>
                  <div className={styles.serviceCard}>
                    <div className={styles.serviceCampus}>Online</div>
                    <div className={styles.serviceTime}>11:30 AM</div>
                    <div className={styles.serviceInfo}>coastalcommunity.tv</div>
                  </div>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={onSubmit} className={styles.form}>
                {/* Parent/Guardian Names */}
                <div className={styles.row}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel} htmlFor="parent-first">Parent/Guardian First Name</label>
                    <div style={{ position: 'relative' }}>
                      <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
                      <input
                        id="parent-first"
                        type="text"
                        className={styles.formInput}
                        placeholder="First Name"
                        value={form.parent_first_name}
                        onChange={(e) => setForm((f) => ({ ...f, parent_first_name: e.target.value }))}
                        required
                        style={{ paddingLeft: 40 }}
                      />
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel} htmlFor="parent-last">Parent/Guardian Last Name</label>
                    <div style={{ position: 'relative' }}>
                      <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
                      <input
                        id="parent-last"
                        type="text"
                        className={styles.formInput}
                        placeholder="Last Name"
                        value={form.parent_last_name}
                        onChange={(e) => setForm((f) => ({ ...f, parent_last_name: e.target.value }))}
                        required
                        style={{ paddingLeft: 40 }}
                      />
                    </div>
                  </div>
                </div>

                {/* Email Address */}
                <div className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="parent-email">Parent/Guardian Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
                    <input
                      id="parent-email"
                      type="email"
                      className={styles.formInput}
                      placeholder="parent@example.com"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      required
                      style={{ paddingLeft: 40 }}
                    />
                  </div>
                </div>

                {/* Phone Number */}
                <div className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="parent-phone">Phone Number</label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
                    <input
                      id="parent-phone"
                      type="tel"
                      className={styles.formInput}
                      placeholder="(561) 555-0199"
                      value={form.phone}
                      onChange={handlePhoneChange}
                      required
                      style={{ paddingLeft: 40 }}
                    />
                  </div>
                </div>

                {/* 8U Player Name */}
                <div className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="player-name">8U Player Name</label>
                  <div style={{ position: 'relative' }}>
                    <Trophy size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
                    <input
                      id="player-name"
                      type="text"
                      className={styles.formInput}
                      placeholder="Enter child's full name"
                      value={form.player_name}
                      onChange={(e) => setForm((f) => ({ ...f, player_name: e.target.value }))}
                      required
                      style={{ paddingLeft: 40 }}
                    />
                  </div>
                  <span style={{ fontSize: '0.65rem', color: '#64748B', marginTop: 4, display: 'block' }}>
                    Used by the coaching staff to track and credit your family's check-in.
                  </span>
                </div>

                {/* Planned Visit (Optional/Not Forced) */}
                <div className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="planned-visit">Event/Service you plan to check out (Optional)</label>
                  <div style={{ position: 'relative' }}>
                    <Calendar size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
                    <select
                      id="planned-visit"
                      className={styles.formSelect}
                      value={form.planned_visit}
                      onChange={(e) => setForm((f) => ({ ...f, planned_visit: e.target.value }))}
                      style={{ paddingLeft: 40 }}
                    >
                      <option value="Unspecified">Select option (Optional)</option>
                      <option value="10:00 AM Service & Block Party">10:00 AM Service & 12:30 PM Block Party</option>
                      <option value="11:30 AM Service & Block Party">11:30 AM Service & 12:30 PM Block Party</option>
                      <option value="12:30 PM Block Party Only">12:30 PM Block Party Only</option>
                      <option value="Just keeping updated">Just keeping updated</option>
                    </select>
                  </div>
                </div>

                {/* SMS opt-in */}
                <div className={styles.optinContainer}>
                  <input
                    type="checkbox"
                    id="sms-opt-in"
                    className={styles.checkbox}
                    checked={form.text_opt_in}
                    onChange={(e) => setForm((f) => ({ ...f, text_opt_in: e.target.checked }))}
                    required
                  />
                  <label htmlFor="sms-opt-in" className={styles.optinText}>
                    I consent to receive text communications regarding Delray Rocks & Coastal Community Church event updates at the number provided above. Message and data rates may apply. Reply STOP to cancel at any time.
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={loading}
                  id="submit-signup-btn"
                >
                  {loading ? (
                    <span className={styles.spinner} />
                  ) : (
                    <>
                      Confirm Partnership Sign Up
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="success-card"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className={styles.successCard}
            >
              <div className={styles.successIconWrapper}>
                <Check size={36} />
              </div>
              <h2 className={styles.successTitle}>Thank You!</h2>
              <p className={styles.successDesc}>
                You have successfully signed up. Your registration has been recorded and credited to <strong>{form.player_name}</strong>.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center', background: 'rgba(0, 0, 0, 0.02)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(0, 0, 0, 0.05)', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#00aef0', fontSize: 'var(--text-sm)', fontWeight: 700 }}>
                  <Heart size={16} /> Event & Visit Details
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  <strong>Coastal Community Church — West Boca Campus</strong><br />
                  Boca Prep International School<br />
                  10333 Diego Drive S., Boca Raton, FL 33428<br />
                  For service times and streaming, visit <a href="https://coastalcommunity.tv" target="_blank" rel="noreferrer" style={{ color: '#00aef0', fontWeight: 600 }}>coastalcommunity.tv</a>
                </div>
              </div>

              <button
                className="btn btn-ghost"
                onClick={() => setSubmitted(false)}
                style={{ margin: '0 auto', color: '#4E5D78' }}
              >
                Sign Up Another Family Member
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className={styles.footer}>
          © {new Date().getFullYear()} Delray Beach Rocks. Managed with the{' '}
          <a href="/login" className={styles.footerLink}>
            DR Intelligence Portal
          </a>
        </div>
      </div>
    </div>
  );
}
