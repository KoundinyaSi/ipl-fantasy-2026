'use client'

import { createClient } from '@/lib/supabase/client'
// import Playing11AdminModalDynamic from '@/components/Playing11AdminModal'
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
    total_points?: number
    correct_predictions?: number
    total_predictions?: number
  }
}

export default function ProfileMenu({ user }: ProfileMenuProps) {
  const [open, setOpen] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [showPlaying11, setShowPlaying11] = useState(false)
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

  async function handleSync() {
    setSyncing(true)
    try {
      const res = await fetch('/api/matches/sync', {
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET ?? ''}` },
      })
      const data = await res.json()
      alert(res.ok ? `✅ Synced ${data.synced} matches, resolved ${data.resultsProcessed} results.` : `❌ Sync failed: ${data.error}`)
    } catch {
      alert('❌ Sync request failed.')
    } finally {
      setSyncing(false)
    }
  }

  const accuracy =
    user.total_predictions && user.total_predictions > 0
      ? Math.round(((user.correct_predictions || 0) / user.total_predictions) * 100)
      : null

  const isAdmin = user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL

  return (
    <>
      <div ref={menuRef} className="relative">
        {/* Avatar trigger */}
        <button
          onClick={() => setOpen(!open)}
          className="w-10 h-10 rounded-full overflow-hidden transition-all duration-200 focus:outline-none"
          style={{
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
                  icon={user.voting_streak >= 3 ? "⚡" : "🎯"}
                  label="Points"
                  value={String(user.total_points ?? 0)}
                />
                <StatBadge
                  icon="🔥"
                  label="Match streak"
                  value={`${user.voting_streak}`}
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
                  {user.login_streak > 0 ? `${user.login_streak} login${user.login_streak !== 1 ? 's' : ''}` : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-brand-muted">Match streak</span>
                <span className="font-medium" style={{ color: user.voting_streak > 0 ? '#FF6B2B' : '#6B6B8A' }}>
                  {user.voting_streak > 0
                    ? `🔥 ${user.voting_streak} match${user.voting_streak !== 1 ? 'es' : ''}`
                    : '—'}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="p-2">
              {isAdmin && (
                <>
                  <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-body transition-colors disabled:opacity-50"
                    style={{ color: '#FFD700' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="23 4 23 10 17 10" />
                      <polyline points="1 20 1 14 7 14" />
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                    </svg>
                    {syncing ? 'Syncing…' : 'Sync match data'}
                  </button>
                  {/* <button
                    onClick={() => { setShowPlaying11(true); setOpen(false) }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-body transition-colors"
                    style={{ color: '#22C55E' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <polyline points="16 11 18 13 22 9" />
                    </svg>
                    Set Playing 11
                  </button> */}
                  <button
                    onClick={() => { setOpen(false); window.location.href = '/admin' }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-body transition-colors"
                    style={{ color: '#FF6B2B' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                      <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
                    </svg>
                    Admin Dashboard
                  </button>
                </>
              )}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-body text-red-400 hover:bg-red-400/10 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
      {showPlaying11 && typeof window !== 'undefined' && (
        <Playing11AdminModalWrapper onClose={() => setShowPlaying11(false)} />
      )}
    </>
  )
}

// Lazy-loads match list and renders Playing11AdminModal
function Playing11AdminModalWrapper({ onClose }: { onClose: () => void }) {
  const [matches, setMatches] = useState<Array<{ id: string; team1: string; team2: string; match_date: string }>>([])
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('matches')
      .select('id, team1, team2, match_date')
      .eq('match_ended', false)
      .order('match_date')
      .then(({ data }) => { if (data) setMatches(data) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!matches.length) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: '#FFD70033', borderTopColor: '#FFD700' }} />
      </div>
    )
  }

  // return <Playing11AdminModalDynamic matches={matches} onClose={onClose} />
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