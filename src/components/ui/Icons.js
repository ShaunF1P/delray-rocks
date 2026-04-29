/**
 * Delray Rocks — Custom SVG Icon Library
 * Premium football-themed icons for the intelligence platform.
 * All icons accept: size (number), color (string), className (string)
 */

const defaultProps = { size: 24, color: 'currentColor' };

export function FootballIcon({ size = 24, color = 'currentColor', ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <ellipse cx="12" cy="12" rx="9" ry="6" transform="rotate(-45 12 12)" stroke={color} strokeWidth="1.8" fill="none" />
      <path d="M9.5 14.5L14.5 9.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M10.5 11L11 10.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M13 13.5L13.5 13" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M11.5 13L12.5 12" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function HelmetIcon({ size = 24, color = 'currentColor', ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M5 13C5 8.58 8.13 5 12 5C15.87 5 19 8.58 19 13V14C19 14.55 18.55 15 18 15H17" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M5 13V14C5 14.55 5.45 15 6 15H8" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 15V18C8 18.55 8.45 19 9 19H10" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M17 15L17 17" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M14 15L14 17" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M11 15L11 17" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M5 11H8C8.55 11 9 11.45 9 12V13" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function WhistleIcon({ size = 24, color = 'currentColor', ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <circle cx="10" cy="14" r="5" stroke={color} strokeWidth="1.8" />
      <path d="M14 10L19 5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M17 7L19 5L21 6" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="14" r="1.5" fill={color} />
    </svg>
  );
}

export function ScoreboardIcon({ size = 24, color = 'currentColor', ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect x="2" y="4" width="20" height="14" rx="2" stroke={color} strokeWidth="1.8" />
      <line x1="12" y1="4" x2="12" y2="18" stroke={color} strokeWidth="1.2" strokeDasharray="2 2" />
      <text x="7" y="14" fontSize="7" fontWeight="800" fill={color} textAnchor="middle" fontFamily="sans-serif">0</text>
      <text x="17" y="14" fontSize="7" fontWeight="800" fill={color} textAnchor="middle" fontFamily="sans-serif">0</text>
      <line x1="5" y1="20" x2="19" y2="20" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="12" y1="18" x2="12" y2="20" stroke={color} strokeWidth="1.8" />
    </svg>
  );
}

export function ClipboardCheckIcon({ size = 24, color = 'currentColor', ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect x="5" y="3" width="14" height="18" rx="2" stroke={color} strokeWidth="1.8" />
      <rect x="8" y="1" width="8" height="4" rx="1" stroke={color} strokeWidth="1.5" fill="none" />
      <path d="M9 13L11 15L15 11" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChartBarIcon({ size = 24, color = 'currentColor', ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect x="3" y="12" width="4" height="8" rx="1" stroke={color} strokeWidth="1.8" />
      <rect x="10" y="7" width="4" height="13" rx="1" stroke={color} strokeWidth="1.8" />
      <rect x="17" y="3" width="4" height="17" rx="1" stroke={color} strokeWidth="1.8" />
    </svg>
  );
}

export function TrophyIcon({ size = 24, color = 'currentColor', ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M8 2H16V9C16 11.21 14.21 13 12 13C9.79 13 8 11.21 8 9V2Z" stroke={color} strokeWidth="1.8" />
      <path d="M8 4H5C4.45 4 4 4.45 4 5V6C4 7.66 5.34 9 7 9H8" stroke={color} strokeWidth="1.5" />
      <path d="M16 4H19C19.55 4 20 4.45 20 5V6C20 7.66 18.66 9 17 9H16" stroke={color} strokeWidth="1.5" />
      <line x1="12" y1="13" x2="12" y2="17" stroke={color} strokeWidth="1.8" />
      <rect x="8" y="17" width="8" height="3" rx="1" stroke={color} strokeWidth="1.8" />
    </svg>
  );
}

export function CalendarIcon({ size = 24, color = 'currentColor', ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect x="3" y="4" width="18" height="17" rx="2" stroke={color} strokeWidth="1.8" />
      <line x1="3" y1="9" x2="21" y2="9" stroke={color} strokeWidth="1.5" />
      <line x1="7" y1="2" x2="7" y2="6" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="17" y1="2" x2="17" y2="6" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="8" cy="13" r="1" fill={color} />
      <circle cx="12" cy="13" r="1" fill={color} />
      <circle cx="16" cy="13" r="1" fill={color} />
      <circle cx="8" cy="17" r="1" fill={color} />
      <circle cx="12" cy="17" r="1" fill={color} />
    </svg>
  );
}

export function DollarIcon({ size = 24, color = 'currentColor', ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8" />
      <path d="M12 6V18" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9 9.5C9 8.12 10.34 7 12 7C13.66 7 15 8.12 15 9.5C15 10.88 13.66 12 12 12C10.34 12 9 13.12 9 14.5C9 15.88 10.34 17 12 17C13.66 17 15 15.88 15 14.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function FlexIcon({ size = 24, color = 'currentColor', ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M7 10C7 10 5 10 5 8C5 6 7 4 9 4C11 4 12 5.5 12 5.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M17 10C17 10 19 10 19 8C19 6 17 4 15 4C13 4 12 5.5 12 5.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7 10V16C7 18.21 9.24 20 12 20C14.76 20 17 18.21 17 16V10" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="12" y1="10" x2="12" y2="16" stroke={color} strokeWidth="1.2" strokeDasharray="2 2" />
    </svg>
  );
}

export function TargetIcon({ size = 24, color = 'currentColor', ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8" />
      <circle cx="12" cy="12" r="5.5" stroke={color} strokeWidth="1.5" />
      <circle cx="12" cy="12" r="2" fill={color} />
    </svg>
  );
}

export function PlaybookIcon({ size = 24, color = 'currentColor', ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect x="4" y="3" width="16" height="18" rx="2" stroke={color} strokeWidth="1.8" />
      <path d="M8 8H12" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8 12H16" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="9" cy="16" r="1.5" stroke={color} strokeWidth="1.2" />
      <path d="M10.5 16L13 14" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="14" cy="16" r="1.5" stroke={color} strokeWidth="1.2" />
      <path d="M13 14L15.5 16" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function LightningIcon({ size = 24, color = 'currentColor', ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M13 2L4 14H12L11 22L20 10H12L13 2Z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function StadiumIcon({ size = 24, color = 'currentColor', ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <ellipse cx="12" cy="16" rx="9" ry="4" stroke={color} strokeWidth="1.8" />
      <path d="M3 16V10C3 7.24 7.03 5 12 5C16.97 5 21 7.24 21 10V16" stroke={color} strokeWidth="1.8" />
      <ellipse cx="12" cy="10" rx="9" ry="4" stroke={color} strokeWidth="1.2" strokeDasharray="3 2" />
      <line x1="6" y1="7" x2="6" y2="3" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="18" y1="7" x2="18" y2="3" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="4" y1="3" x2="8" y2="3" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16" y1="3" x2="20" y2="3" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function GameLogIcon({ size = 24, color = 'currentColor', ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect x="4" y="2" width="16" height="20" rx="2" stroke={color} strokeWidth="1.8" />
      <line x1="8" y1="7" x2="16" y2="7" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="8" y1="11" x2="14" y2="11" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="8" y1="15" x2="12" y2="15" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function MedalGoldIcon({ size = 24, color = 'currentColor', ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <circle cx="12" cy="15" r="6" stroke={color} strokeWidth="1.8" />
      <path d="M9 3L7 9" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M15 3L17 9" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 11V15" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10 15H14" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 13H12" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function MedalSilverIcon({ size = 24, color = 'currentColor', ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <circle cx="12" cy="15" r="6" stroke={color} strokeWidth="1.8" />
      <path d="M9 3L7 9" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M15 3L17 9" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10 13C10 13 11 12 12 12C13 12 14 13 14 14C14 15 12 17 10 18H14" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MedalBronzeIcon({ size = 24, color = 'currentColor', ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <circle cx="12" cy="15" r="6" stroke={color} strokeWidth="1.8" />
      <path d="M9 3L7 9" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M15 3L17 9" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10 12H13C13.55 12 14 12.45 14 13C14 13.55 13.55 14 13 14H11" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M11 14H13C13.55 14 14 14.45 14 15C14 15.55 13.55 16 13 16H10" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function RunnerIcon({ size = 24, color = 'currentColor', ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <circle cx="14" cy="4" r="2" stroke={color} strokeWidth="1.8" />
      <path d="M7 11L10 8L13 10L17 7" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 8L8 16" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M13 10L15 18" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 16L5 21" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M15 18L19 21" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function ShieldCheckIcon({ size = 24, color = 'currentColor', ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M12 3L4 7V12C4 16.42 7.42 20.44 12 21.5C16.58 20.44 20 16.42 20 12V7L12 3Z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 12L11 14L15 10" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
