'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, Calendar, ClipboardCheck, BarChart3,
  DollarSign, Settings, Film, Trophy, ChevronLeft, ChevronRight,
  User, LogOut, Star, Zap, Shield, Activity, FileText, UserCog, BookOpen, Gamepad2, Dumbbell
} from 'lucide-react';

const coachMenuItems = [
  { label: 'Dashboard', href: '/coach/dashboard', icon: LayoutDashboard },
  { label: 'Roster', href: '/coach/roster', icon: Users },
  { label: 'Coaching Staff', href: '/coach/staff', icon: UserCog },
  { label: 'Events', href: '/coach/events', icon: Calendar },
  { label: 'Evaluate', href: '/coach/evaluate', icon: Star },
  { label: 'Form Analysis', href: '/coach/form-analysis', icon: Activity, badge: 'Eval' },
  { label: 'Attendance', href: '/coach/attendance', icon: ClipboardCheck },
  { label: 'Film Room', href: '/coach/film', icon: Film, badge: 'Intel' },
  { label: 'Playbook', href: '/coach/playbook', icon: BookOpen, badge: 'NEW' },
  { label: 'Sideline', href: '/coach/sideline', icon: Gamepad2, badge: '🏈' },
  { label: 'Training', href: '/coach/training', icon: Dumbbell },
  { label: 'Highlights', href: '/coach/highlights', icon: Trophy },
  { label: 'Analytics', href: '/coach/analytics', icon: BarChart3 },
  { label: 'Parent Reports', href: '/coach/reports', icon: FileText },
  { label: 'Fundraising', href: '/coach/fundraising', icon: DollarSign },
  { label: 'Live Game', href: '/coach/live', icon: Zap },
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
  const pathname = usePathname();
  const menuItems = role === 'coach' ? coachMenuItems : parentMenuItems;

  function toggleCollapse() {
    const next = !collapsed;
    setCollapsed(next);
    onCollapse?.(next);
  }

  return (
    <motion.aside
      className="sidebar"
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 'var(--z-sidebar)',
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
        padding: collapsed ? '1.25rem 0.75rem' : '1.25rem 1.25rem',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        minHeight: '64px',
      }}>
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
          {!collapsed && (
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

            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: collapsed ? '0.625rem' : '0.625rem 0.875rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#009A44' : 'var(--text-secondary)',
                  background: isActive ? 'rgba(16, 107, 58, 0.12)' : 'transparent',
                  transition: 'all 150ms ease',
                  textDecoration: 'none',
                  position: 'relative',
                  justifyContent: collapsed ? 'center' : 'flex-start',
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
                  {!collapsed && (
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
                {!collapsed && item.badge && (
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
        padding: collapsed ? '0.75rem' : '0.75rem 1rem',
        borderTop: '1px solid var(--border)',
      }}>
        {!collapsed && (
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
      </div>
    </motion.aside>
  );
}
