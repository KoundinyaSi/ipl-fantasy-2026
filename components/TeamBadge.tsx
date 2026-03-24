'use client'

import { getTeamInfo } from '@/lib/teams'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { useState } from 'react'

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
  sm: { badge: 'w-10 h-10', abbr: 'text-[10px]', name: 'text-xs' },
  md: { badge: 'w-14 h-14', abbr: 'text-xs', name: 'text-xs' },
  lg: { badge: 'w-20 h-20', abbr: 'text-sm', name: 'text-sm' },
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
  const [imgError, setImgError] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-1.5 relative',
        isClickable && 'cursor-pointer',
        locked && 'opacity-70 cursor-not-allowed',
        className
      )}
      onClick={isClickable ? onClick : undefined}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => e.key === 'Enter' && onClick?.() : undefined}
    >
      {/* Full team name tooltip — desktop hover */}
      {showTooltip && (
        <div
          className="absolute -top-9 left-1/2 -translate-x-1/2 z-50 px-2.5 py-1.5 rounded-lg text-xs font-body font-medium text-white whitespace-nowrap pointer-events-none"
          style={{
            background: 'rgba(18,18,26,0.95)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          }}
        >
          {team}
          <div
            className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent"
            style={{ borderTopColor: 'rgba(18,18,26,0.95)' }}
          />
        </div>
      )}

      {/* Badge */}
      <div
        className={cn(
          'team-glow rounded-2xl flex items-center justify-center overflow-hidden transition-all duration-200 relative',
          s.badge,
          selected && 'selected'
        )}
        style={{
          background: selected
            ? `linear-gradient(135deg, ${info.primaryColor}33, ${info.secondaryColor}22)`
            : `${info.primaryColor}18`,
          border: selected
            ? `2px solid ${info.primaryColor}`
            : `2px solid ${info.primaryColor}44`,
          // @ts-expect-error CSS custom property
          '--glow-color': info.primaryColor,
          boxShadow: selected
            ? `0 0 0 2px ${info.primaryColor}, 0 0 20px ${info.primaryColor}55`
            : 'none',
        }}
      >
        {info.logoUrl && !imgError ? (
          <Image
            src={info.logoUrl}
            alt={team}
            width={size === 'lg' ? 56 : size === 'md' ? 40 : 28}
            height={size === 'lg' ? 56 : size === 'md' ? 40 : 28}
            className="object-contain p-1.5"
            onError={() => setImgError(true)}
            unoptimized
          />
        ) : (
          <span
            className={cn('font-display font-bold', s.abbr)}
            style={{ color: selected ? info.primaryColor : `${info.primaryColor}cc` }}
          >
            {info.abbr}
          </span>
        )}
      </div>

      {/* Abbr + full name */}
      {showName && (
        <div className="flex flex-col items-center gap-0.5">
          <span
            className={cn('font-display font-semibold', s.abbr, selected ? 'text-white' : 'text-brand-muted')}
          >
            {info.abbr}
          </span>
        </div>
      )}
    </div>
  )
}