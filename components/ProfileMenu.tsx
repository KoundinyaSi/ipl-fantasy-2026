'use client'

import { createClient } from '@/lib/supabase/client'
import { getInitials } from '@/lib/utils'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

interface ProfileMenuProps {
  user: {
    name: string
    avatar_url: string | null
    email: string
    voting_streak: number
    login_streak: number
    correct_predictions?: number
    total_predictions?: number
  }
}

export default function ProfileMenu({ user }: ProfileMenuProps) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const accuracy =
    user.total_predictions && user.total_predictions > 0
      ? Math.round(((user.correct_predictions || 0) / user.total_predictions) * 100)
      : null

  return (
    <div ref={menuRef} className="relative">
      {/* Avatar trigger */}
      <button
        onClick={() => setOpen(!open)}
        className="w-10 h-10 rounded-full overflow-hidden ring-2 transition-all duration-200 focus:outline-none"
        style={{
          ringColor: open ? '#FF6B2B' : 'transparent',
          boxShadow: open ? '0 0 0 2px #FF6B2B' : '0 0 0 2px rgba(255,255,255,0.1)',
        }}
        aria-label="Profile menu"
      >
        {user.avatar_url ? (
          <Image
            src={user.avatar_url}
            alt={user.name}
            width={40}
            height={40}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-sm font-display font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #FF6B2B, #FFD700)' }}
          >
            {getInitials(user.name)}
          </div>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 top-12 w-72 glass-strong rounded-2xl overflow-hidden animate-in"
          style={{ boxShadow: '0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)' }}
        >
          {/* User info */}
          <div className="px-5 py-4 border-b border-brand-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                {user.avatar_url ? (
                  <Image
                    src={user.avatar_url}
                    alt={user.name}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-sm font-display font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, #FF6B2B, #FFD700)' }}
                  >
                    {getInitials(user.name)}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="font-display font-semibold text-white truncate">{user.name}</div>
                <div className="text-xs text-brand-muted truncate">{user.email}</div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="px-5 py-4 border-b border-brand-border">
            <div className="text-xs text-brand-muted uppercase tracking-wider mb-3 font-body">
              Your Stats
            </div>
            <div className="grid grid-cols-3 gap-3">
              <StatBadge
                icon="🎯"
                label="Points"
                value={String(user.correct_predictions ?? 0)}
              />
              <StatBadge
                icon="🔥"
                label="Vote streak"
                value={`${user.voting_streak}d`}
              />
              <StatBadge
                icon="📅"
                label="Accuracy"
                value={accuracy !== null ? `${accuracy}%` : '—'}
              />
            </div>
          </div>

          {/* Streaks detail */}
          <div className="px-5 py-3 border-b border-brand-border">
            <div className="flex items-center justify-between text-sm">
              <span className="text-brand-muted">Login streak</span>
              <span className="text-white font-medium">
                {user.login_streak > 0 ? `${user.login_streak} day${user.login_streak !== 1 ? 's' : ''}` : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-brand-muted">Correct vote streak</span>
              <span className="font-medium" style={{ color: user.voting_streak > 0 ? '#FF6B2B' : '#6B6B8A' }}>
                {user.voting_streak > 0
                  ? `🔥 ${user.voting_streak} day${user.voting_streak !== 1 ? 's' : ''}`
                  : '—'}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="p-2">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-body text-red-400 hover:bg-red-400/10 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function StatBadge({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div
      className="rounded-xl p-2.5 text-center"
      style={{ background: '#0A0A0F' }}
    >
      <div className="text-lg mb-0.5">{icon}</div>
      <div className="font-display text-white font-semibold text-sm">{value}</div>
      <div className="text-brand-muted text-xs mt-0.5">{label}</div>
    </div>
  )
}
