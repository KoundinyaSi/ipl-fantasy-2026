import { getTeamInfo } from '@/lib/teams'
import { cn } from '@/lib/utils'

interface TeamBadgeProps {
  team: string
  size?: 'sm' | 'md' | 'lg'
  selected?: boolean
  locked?: boolean
  onClick?: () => void
  showName?: boolean
  className?: string
}

const sizes = {
  sm: { badge: 'w-10 h-10 text-xs', name: 'text-xs' },
  md: { badge: 'w-14 h-14 text-sm', name: 'text-xs' },
  lg: { badge: 'w-20 h-20 text-base', name: 'text-sm' },
}

export default function TeamBadge({
  team,
  size = 'md',
  selected = false,
  locked = false,
  onClick,
  showName = true,
  className,
}: TeamBadgeProps) {
  const info = getTeamInfo(team)
  const s = sizes[size]
  const isClickable = !!onClick && !locked

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2',
        isClickable && 'cursor-pointer',
        locked && 'opacity-70 cursor-not-allowed',
        className
      )}
      onClick={isClickable ? onClick : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => e.key === 'Enter' && onClick?.() : undefined}
    >
      <div
        className={cn(
          'team-glow rounded-xl flex items-center justify-center font-display font-bold transition-all duration-200',
          s.badge,
          selected && 'selected'
        )}
        style={{
          background: selected
            ? `linear-gradient(135deg, ${info.primaryColor}, ${info.secondaryColor})`
            : `${info.primaryColor}22`,
          border: selected
            ? `2px solid ${info.primaryColor}`
            : `2px solid ${info.primaryColor}44`,
          color: selected ? info.textColor : info.primaryColor,
          // @ts-expect-error CSS custom property
          '--glow-color': info.primaryColor,
          boxShadow: selected
            ? `0 0 0 2px ${info.primaryColor}, 0 0 20px ${info.primaryColor}55`
            : 'none',
        }}
      >
        {info.abbr}
      </div>
      {showName && (
        <span
          className={cn(
            'text-center leading-tight max-w-[80px]',
            s.name,
            selected ? 'text-white font-medium' : 'text-brand-muted'
          )}
        >
          {team.split(' ').slice(-1)[0]}
        </span>
      )}
    </div>
  )
}
