'use client';

import { getPositionColor } from '@/lib/supabase';

/* ═══ Card ═══ */
export function Card({ children, className = '', hover = true, highlight = false, style = {}, ...props }) {
  const cls = highlight ? 'card-highlight' : hover ? 'card' : 'card-flat';
  return (
    <div className={`${cls} ${className}`} style={style} {...props}>
      {children}
    </div>
  );
}

/* ═══ Button ═══ */
export function Button({
  children, variant = 'primary', size = 'md', icon, iconRight,
  loading = false, disabled = false, className = '', ...props
}) {
  const sizeClass = size === 'lg' ? 'btn-lg' : size === 'sm' ? 'btn-sm' : '';
  const variantClass = `btn-${variant}`;

  return (
    <button
      className={`btn ${variantClass} ${sizeClass} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span style={{
          width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)',
          borderTopColor: 'currentColor', borderRadius: '50%',
          animation: 'spin 0.6s linear infinite', flexShrink: 0,
        }} />
      )}
      {!loading && icon && <span style={{ display: 'flex', flexShrink: 0 }}>{icon}</span>}
      {children}
      {iconRight && <span style={{ display: 'flex', flexShrink: 0 }}>{iconRight}</span>}
    </button>
  );
}

/* ═══ Badge ═══ */
export function Badge({ children, variant = 'gold', className = '', ...props }) {
  return (
    <span className={`badge badge-${variant} ${className}`} {...props}>
      {children}
    </span>
  );
}

/* ═══ Position Badge ═══ */
export function PositionBadge({ position }) {
  if (!position) return null;
  return (
    <span className={`badge ${getPositionColor(position)}`}>
      {position}
    </span>
  );
}

/* ═══ Avatar ═══ */
export function Avatar({ src, name, size = 48, className = '' }) {
  const initials = name
    ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  if (src) {
    return (
      <img
        src={src}
        alt={name || 'Avatar'}
        className={className}
        style={{
          width: size, height: size, borderRadius: '50%',
          objectFit: 'cover', border: '2px solid var(--border)',
        }}
      />
    );
  }

  return (
    <div
      className={className}
      style={{
        width: size, height: size, borderRadius: '50%',
        background: 'linear-gradient(135deg, var(--rocks-gold-dim), var(--electric-blue-dim))',
        border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.35, fontWeight: 700,
        color: 'var(--text-secondary)', flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

/* ═══ Empty State ═══ */
export function EmptyState({ icon, title, description, action }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '4rem 2rem', textAlign: 'center',
    }}>
      {icon && <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.4 }}>{icon}</div>}
      <h3 style={{ fontSize: 'var(--text-xl)', marginBottom: '0.5rem' }}>{title}</h3>
      {description && (
        <p style={{ color: 'var(--text-dim)', fontSize: 'var(--text-sm)', maxWidth: 400, marginBottom: '1.5rem' }}>
          {description}
        </p>
      )}
      {action}
    </div>
  );
}

/* ═══ Skeleton ═══ */
export function Skeleton({ width, height = 14, circle = false, className = '' }) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width: width || '100%',
        height,
        borderRadius: circle ? '50%' : 'var(--radius-sm)',
      }}
    />
  );
}

/* ═══ Page Header ═══ */
export function PageHeader({ title, subtitle, actions, breadcrumbs }) {
  return (
    <div style={{ marginBottom: 'var(--space-xl)' }}>
      {breadcrumbs && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          marginBottom: 'var(--space-sm)', fontSize: 'var(--text-xs)',
          color: 'var(--text-dim)',
        }}>
          {breadcrumbs.map((crumb, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {i > 0 && <span>/</span>}
              {crumb.href ? (
                <a href={crumb.href} style={{ color: 'var(--text-dim)' }}>{crumb.label}</a>
              ) : (
                <span style={{ color: 'var(--text-secondary)' }}>{crumb.label}</span>
              )}
            </span>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, letterSpacing: '-0.03em' }}>{title}</h1>
          {subtitle && <p style={{ color: 'var(--text-dim)', fontSize: 'var(--text-sm)', marginTop: '0.25rem' }}>{subtitle}</p>}
        </div>
        {actions && <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, flexWrap: 'wrap' }}>{actions}</div>}
      </div>
    </div>
  );
}

/* ═══ Modal ═══ */
export function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  if (!isOpen) return null;

  const widthMap = { sm: 420, md: 560, lg: 720, xl: 900, full: '95vw' };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 'var(--z-modal)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div style={{
        position: 'absolute', inset: 0,
        background: 'var(--bg-overlay)', backdropFilter: 'blur(8px)',
      }} />
      <div
        className="animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%', maxWidth: typeof widthMap[size] === 'number' ? Math.min(widthMap[size], window?.innerWidth - 32 || widthMap[size]) : widthMap[size],
          maxHeight: '90vh', overflow: 'auto',
          background: 'var(--bg-glass-heavy)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-xl)',
          backdropFilter: 'blur(40px)',
        }}
      >
        {title && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)',
          }}>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>{title}</h3>
            <button className="btn btn-ghost btn-icon" onClick={onClose} style={{ fontSize: '1.25rem' }}>✕</button>
          </div>
        )}
        <div style={{ padding: '1.5rem' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
