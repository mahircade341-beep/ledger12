import type { ReactNode } from 'react';

/**
 * Shared studio page header — consistent Spotify-style heading with a
 * vivid gradient accent, bold title, subtitle, and an actions slot.
 */
export default function PageHeader({
  title,
  subtitle,
  accent = 'orange',
  actions,
  className = '',
}: {
  title: string;
  subtitle?: string;
  accent?: 'orange' | 'blue' | 'green' | 'purple' | 'pink';
  actions?: ReactNode;
  className?: string;
}) {
  const gradient =
    accent === 'blue' ? 'linear-gradient(90deg,#0A84FF,#5E5CE6)' :
    accent === 'green' ? 'linear-gradient(90deg,#30D158,#00C7BE)' :
    accent === 'purple' ? 'linear-gradient(90deg,#BF5AF2,#5E5CE6)' :
    accent === 'pink' ? 'linear-gradient(90deg,#FF375F,#FF9F0A)' :
    'linear-gradient(90deg,#FF3B30,#FF9500)';

  return (
    <div className={`flex items-center justify-between flex-wrap gap-3 ${className}`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-1 h-9 rounded-full shrink-0" style={{ background: gradient, boxShadow: '0 0 14px rgba(255,59,48,0.35)' }} />
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-[26px] font-extrabold tracking-tight text-white truncate">{title}</h1>
          {subtitle && <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}
