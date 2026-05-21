'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, Calendar, ClipboardCheck, BarChart3,
  DollarSign, Settings, Film, Trophy, ChevronLeft, ChevronRight,
  User, LogOut, Star, Zap, Shield, Activity, FileText, UserCog, BookOpen, Gamepad2, Dumbbell,
  Menu, X
} from 'lucide-react';

const coachMenuItems = [
  { label: 'Dashboard', href: '/coach/dashboard', icon: LayoutDashboard },
  { label: 'Roster', href: '/coach/roster', icon: Users },
  { label: 'Depth Chart', href: '/coach/depth-chart', icon: Shield },
  { label: 'Coaching Staff', href: '/coach/staff', icon: UserCog },
  { label: 'Awards', href: '/coach/awards', icon: Trophy, badge: 'NEW' },
  { label: 'Activity Feed', href: '/coach/activity', icon: Activity },
  { label: 'Events', href: '/coach/events', icon: Calendar },
  { label: 'Practice Plan', href: '/coach/practice', icon: ClipboardCheck, badge: 'NEW' },
  { label: 'Evaluate', href: '/coach/evaluate', icon: Star },
  { label: 'Form Analysis', href: '/coach/form-analysis', icon: Activity, badge: 'Eval' },
  { label: 'Attendance', href: '/coach/attendance', icon: ClipboardCheck },
  { label: 'Film Room', href: '/coach/film', icon: Film, badge: 'Intel' },
  { label: 'Playbook', href: '/coach/playbook', icon: BookOpen },
  { label: 'Sideline', href: '/coach/sideline', icon: Gamepad2, badge: '🏈' },
  { label: 'Post-Game', href: '/coach/post-game', icon: FileText, badge: 'NEW' },
  { label: 'Scouting', href: '/coach/scouting', icon: Trophy, badge: 'NEW' },
  { label: 'Training', href: '/coach/training', icon: Dumbbell },
  { label: 'Season Stats', href: '/coach/season', icon: BarChart3, badge: 'NEW' },
  { label: 'Highlights', href: '/coach/highlights', icon: Trophy },
  { label: 'Parent Reports', href: '/coach/reports', icon: FileText },
  { label: 'Fundraising', href: '/coach/fundraising', icon: DollarSign },
  { label: 'Settings', href: '/coach/settings', icon: Settings },
];

const parentMenuItems = [
  { label: 'Dashboard', href: '/parent/dashboard', icon: LayoutDashboard },
  { label: 'My Children', href: '/parent/children', icon: Users },
  { label: 'Schedule', href: '/parent/schedule', icon: Calendar },
  { label: 'Reports', href: '/parent/reports', icon: BarChart3 },
  { label: 'Highlights', href: '/parent/highlights', icon: Trophy },
  { label: 'Fundraising', href: '/parent/fundraising', icon: DollarSign },
  { label: 'Registration', href: '/parent/registration', icon: ClipboardCheck },
];

export function Sidebar({ role = 'coach', orgName = 'Delray Rocks', userName = 'Coach', onSignOut, onCollapse }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();
  const menuItems = role === 'coach' ? coachMenuItems : parentMenuItems;

  // Detect mobile viewport
  useEffect(() => {
    function checkMobile() {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) setMobileOpen(false);
    }
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close mobile sidebar on navigation
  useEffect(() => {
    if (isMobile) setMobileOpen(false);
  }, [pathname, isMobile]);

  function toggleCollapse() {
    const next = !collapsed;
    setCollapsed(next);
    onCollapse?.(next);
  }

  // Mobile hamburger button (rendered via portal-like positioning)
  const mobileToggle = isMobile && !mobileOpen ? (
    <button
      onClick={() => setMobileOpen(true)}
      aria-label="Open menu"
      style={{
        position: 'fixed',
        top: 12,
        left: 12,
        zIndex: 1100,
        width: 44,
        height: 44,
        borderRadius: 12,
        background: 'rgba(6, 14, 24, 0.95)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: '#fff',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      }}
    >
      <Menu size={22} />
    </button>
  ) : null;

  // Overlay for mobile
  const mobileOverlay = isMobile && mobileOpen ? (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={() => setMobileOpen(false)}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 1199,
      }}
    />
  ) : null;

  // Don't render sidebar on mobile when closed (except the hamburger)
  const shouldShowSidebar = !isMobile || mobileOpen;
  const sidebarWidth = isMobile ? 280 : (collapsed ? 72 : 260);

  return (
    <>
      {mobileToggle}
      <AnimatePresence>
        {mobileOverlay}
      </AnimatePresence>

      <AnimatePresence>
        {shouldShowSidebar && (
          <motion.aside
            className="sidebar"
            initial={isMobile ? { x: -300 } : false}
            animate={{ width: sidebarWidth, x: 0 }}
            exit={isMobile ? { x: -300 } : undefined}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 0,
              zIndex: isMobile ? 1200 : 'var(--z-sidebar)',
              background: 'rgba(6, 14, 24, 0.95)',
              backdropFilter: 'blur(24px)',
              borderRight: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Logo */}
            <div style={{
              padding: collapsed && !isMobile ? '1.25rem 0.75rem' : '1.25rem 1.25rem',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              minHeight: '64px',
            }}>
              {isMobile && (
                <button
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close menu"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-dim)', padding: 4, marginRight: 4,
                  }}
                >
                  <X size={20} />
                </button>
              )}
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                flexShrink: 0,
              }}>
                <img src="/dr-logo.jpg" alt="DR" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <AnimatePresence>
                {(!collapsed || isMobile) && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                      DELRAY ROCKS
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>
                      8U Football
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Navigation */}
            <nav style={{ flex: 1, padding: '0.75rem', overflowY: 'auto', overflowX: 'hidden' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {menuItems.map((item) => {
                  const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                  const Icon = item.icon;
                  const showLabel = !collapsed || isMobile;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: collapsed && !isMobile ? '0.625rem' : '0.625rem 0.875rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 'var(--text-sm)',
                        fontWeight: isActive ? 600 : 500,
                        color: isActive ? '#009A44' : 'var(--text-secondary)',
                        background: isActive ? 'rgba(16, 107, 58, 0.12)' : 'transparent',
                        transition: 'all 150ms ease',
                        textDecoration: 'none',
                        position: 'relative',
                        justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'var(--bg-glass)';
                          e.currentTarget.style.color = 'var(--text-primary)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = 'var(--text-secondary)';
                        }
                      }}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="sidebar-active"
                          style={{
                            position: 'absolute',
                            left: 0,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: 3,
                            height: 20,
                            borderRadius: '0 4px 4px 0',
                            background: '#009A44',
                          }}
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        />
                      )}
                      <Icon size={18} />
                      <AnimatePresence>
                        {showLabel && (
                          <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            style={{ flex: 1 }}
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                      {showLabel && item.badge && (
                        <span className={item.badge === 'AI' ? 'badge badge-purple' : 'badge badge-gold'} style={{ fontSize: '0.6rem', padding: '1px 6px' }}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </nav>

            {/* Footer */}
            <div style={{
              padding: collapsed && !isMobile ? '0.75rem' : '0.75rem 1rem',
              borderTop: '1px solid var(--border)',
            }}>
              {(!collapsed || isMobile) && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0',
                  marginBottom: '0.5rem',
                }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'var(--bg-glass)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <User size={16} color="var(--text-secondary)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', textTransform: 'capitalize' }}>{role}</div>
                  </div>
                  <button
                    onClick={onSignOut}
                    className="btn btn-ghost btn-icon"
                    title="Sign out"
                    style={{ padding: '0.375rem' }}
                  >
                    <LogOut size={16} />
                  </button>
                </div>
              )}

              {/* Hide collapse button on mobile */}
              {!isMobile && (
                <button
                  onClick={toggleCollapse}
                  className="btn btn-ghost"
                  style={{
                    width: '100%',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    padding: '0.5rem',
                  }}
                >
                  {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                  {!collapsed && <span style={{ fontSize: 'var(--text-xs)' }}>Collapse</span>}
                </button>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
