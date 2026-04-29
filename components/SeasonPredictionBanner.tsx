'use client'

import { IPL_TEAMS, getTeamInfo } from '@/lib/teams'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { getInitials } from '@/lib/utils'

interface SeasonPick {
  user_id: string
  first_place: string
  second_place: string
  points_awarded: number | null
  profiles?: {
    id: string
    name: string
    avatar_url: string | null
  }
}

interface SeasonData {
  lock_at: string | null
  locked: boolean
  my_pick: SeasonPick | null
  all_picks: SeasonPick[] | null
}

const IPL_TEAM_NAMES = Object.keys(IPL_TEAMS).filter(
  (t) => !t.toLowerCase().includes('bangalore') // dedupe RCB alias
)

export default function SeasonPredictionBanner() {
  const [data, setData] = useState<SeasonData | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [first, setFirst] = useState('')
  const [second, setSecond] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState('')

  useEffect(() => {
    fetch('/api/season')
      .then(r => r.json())
      .then(d => {
        setData(d)
        if (d.my_pick) {
          setFirst(d.my_pick.first_place)
          setSecond(d.my_pick.second_place)
        }
      })
  }, [])

  // Countdown to lock
  useEffect(() => {
    if (!data?.lock_at || data.locked) return
    function tick() {
      const diff = new Date(data!.lock_at!).getTime() - Date.now()
      if (diff <= 0) { setCountdown('Locked'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setCountdown(`${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`)
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [data])

  async function handleSave() {
    if (!first || !second) { setError('Pick both teams'); return }
    if (first === second) { setError('Pick different teams'); return }
    setSaving(true)
    setError('')
    const res = await fetch('/api/season', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ first_place: first, second_place: second }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error); setSaving(false); return }
    setData(prev => prev ? { ...prev, my_pick: json.pick } : prev)
    setShowPicker(false)
    setSaving(false)
  }

  if (!data) return null

  const hasPick = !!data.my_pick
  const isLocked = data.locked
  const resultsOut = data.all_picks?.some(p => p.points_awarded !== null)

  return (
    <div className="mb-5">
      {/* Main banner */}
      <div
        className="rounded-2xl overflow-hidden cursor-pointer relative"
        onClick={() => setExpanded(v => !v)}
        style={{
          background: 'linear-gradient(135deg, #1a0a2e, #0f1a3a)',
          border: '1px solid rgba(255,215,0,0.25)',
          boxShadow: '0 0 32px rgba(255,215,0,0.08)',
        }}
      >
        {/* Gold shimmer top border */}
        <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, #FFD700, #FF6B2B, #FFD700, transparent)' }} />

        <div className="px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{ background: 'rgba(255,215,0,0.12)', border: '1px solid rgba(255,215,0,0.2)' }}
              >
                🏆
              </div>
              <div>
                <div className="font-display font-bold text-white text-sm leading-tight">
                  IPL 2026 Season Prediction
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: '#FFD700' }}>
                  {resultsOut
                    ? 'Results are in!'
                    : isLocked
                    ? hasPick ? '🔒 Your pick is locked in' : '🔒 Voting closed — no pick placed'
                    : hasPick
                    ? `⏱ ${countdown} to lock`
                    : `⏱ ${countdown} left to pick`
                  }
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {hasPick && (
                <div className="flex items-center gap-1">
                  <TeamPill team={data.my_pick!.first_place} label="1st" />
                  <TeamPill team={data.my_pick!.second_place} label="2nd" />
                </div>
              )}
              <span className="text-brand-muted text-xs">{expanded ? '▲' : '▼'}</span>
            </div>
          </div>

          {/* Points breakdown — always visible */}
          {!hasPick && !isLocked && (
            <div className="mt-3 flex items-center gap-3 text-[11px] text-brand-muted">
              <span>🥇 1st correct → <strong className="text-white">+10 pts</strong></span>
              <span>·</span>
              <span>🥈 2nd correct → <strong className="text-white">+5 pts</strong></span>
            </div>
          )}
        </div>

        {/* Expanded content */}
        {expanded && (
          <div
            className="px-4 pb-4"
            onClick={e => e.stopPropagation()}
            style={{ borderTop: '1px solid rgba(255,215,0,0.1)' }}
          >
            {/* Points guide */}
            <div className="pt-3 pb-3 flex gap-3">
              {[
                { icon: '🥇', label: 'accurate 1st place prediction', pts: '+10' },
                { icon: '🥈', label: 'accurate 2nd place prediction', pts: '+5' },
                // { icon: '🥈', label: '2nd only', pts: '0' },
              ].map(r => (
                <div key={r.label} className="flex-1 rounded-xl px-2 py-2 text-center"
                  style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <div className="text-base">{r.icon}</div>
                  <div className="font-display font-bold text-sm mt-0.5"
                    style={{ color: r.pts === '0' ? '#6B6B8A' : '#FFD700' }}>{r.pts}</div>
                  <div className="text-[10px] text-brand-muted mt-0.5 leading-tight">{r.label}</div>
                </div>
              ))}
            </div>

            {/* CTA or locked state */}
            {!isLocked && (
              <button
                onClick={() => setShowPicker(true)}
                className="w-full py-3 rounded-xl text-sm font-body font-semibold text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #FFD700, #FF6B2B)', color: '#000' }}
              >
                {hasPick ? '✏️ Change your pick' : '🏆 Make your prediction'}
              </button>
            )}

            {/* All picks — visible after lock */}
            {isLocked && data.all_picks && data.all_picks.length > 0 && (
              <div className="mt-1">
                <div className="text-[10px] text-brand-muted uppercase tracking-wider mb-2">
                  Everyone's picks
                </div>
                <div className="space-y-2">
                  {data.all_picks.map(pick => (
                    <div key={pick.user_id} className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                        {pick.profiles?.avatar_url ? (
                          <Image src={pick.profiles.avatar_url} alt={pick.profiles.name ?? ''} width={24} height={24} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-white"
                            style={{ background: '#3A3A5A' }}>
                            {getInitials(pick.profiles?.name ?? '?')}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-white flex-1 truncate">
                        {pick.profiles?.name?.split(' ')[0]}
                      </span>
                      <div className="flex items-center gap-1">
                        <TeamPill team={pick.first_place} label="1" small />
                        <TeamPill team={pick.second_place} label="2" small />
                      </div>
                      {pick.points_awarded !== null && (
                        <span
                          className="text-xs font-display font-bold w-8 text-right"
                          style={{ color: pick.points_awarded > 0 ? '#FFD700' : '#6B6B8A' }}
                        >
                          {pick.points_awarded > 0 ? `+${pick.points_awarded}` : '—'}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Team picker modal */}
      {showPicker && (
        <SeasonPickerModal
          initialFirst={first}
          initialSecond={second}
          saving={saving}
          error={error}
          onFirstChange={setFirst}
          onSecondChange={setSecond}
          onSave={handleSave}
          onClose={() => { setShowPicker(false); setError('') }}
        />
      )}
    </div>
  )
}

function TeamPill({ team, label, small = false }: { team: string; label: string; small?: boolean }) {
  const info = getTeamInfo(team)
  return (
    <div
      className="flex items-center gap-1 rounded-lg"
      style={{
        background: `${info.primaryColor}22`,
        border: `1px solid ${info.primaryColor}44`,
        padding: small ? '2px 6px' : '3px 8px',
      }}
    >
      <span className="text-[10px] text-brand-muted">{label}</span>
      <span
        className="font-display font-bold"
        style={{ fontSize: small ? 10 : 11, color: info.primaryColor }}
      >
        {info.abbr}
      </span>
    </div>
  )
}

function SeasonPickerModal({
  initialFirst,
  initialSecond,
  saving,
  error,
  onFirstChange,
  onSecondChange,
  onSave,
  onClose,
}: {
  initialFirst: string
  initialSecond: string
  saving: boolean
  error: string
  onFirstChange: (t: string) => void
  onSecondChange: (t: string) => void
  onSave: () => void
  onClose: () => void
}) {
  const [localFirst, setLocalFirst] = useState(initialFirst)
  const [localSecond, setLocalSecond] = useState(initialSecond)

  // useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = '' } }, [])

  function handleFirstChange(t: string) { setLocalFirst(t); onFirstChange(t) }
  function handleSecondChange(t: string) { setLocalSecond(t); onSecondChange(t) }

  const teams = IPL_TEAM_NAMES

  return (
    <div
      className="fixed inset-0 z-50 flex"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full rounded-t-3xl animate-in"
        style={{ background: '#12121A', border: '1px solid rgba(255,215,0,0.15)', maxHeight: '85vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: '#2E2E3E' }} />
        </div>

        <div className="px-5 pt-2 pb-2 flex items-center justify-between">
          <div>
            <h3 className="font-display font-bold text-white">IPL 2026 Prediction</h3>
            <p className="text-xs text-brand-muted mt-0.5">Pick your winner and runner-up</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-brand-muted"
            style={{ background: '#1E1E2E' }}>✕</button>
        </div>

        {error && (
          <div className="mx-5 mb-2 px-3 py-2 rounded-xl text-xs text-red-400"
            style={{ background: 'rgba(239,68,68,0.1)' }}>{error}</div>
        )}

        {/* First place */}
        <div className="px-5 pb-3">
          <div className="text-xs font-body font-semibold uppercase tracking-wider mb-2"
            style={{ color: '#FFD700' }}>🥇 IPL Winner</div>
          <div className="grid grid-cols-2 gap-2">
            {teams.map(team => {
              const info = getTeamInfo(team)
              const selected = localFirst === team
              return (
                <button
                  key={team}
                  onClick={() => { if (localSecond === team) handleSecondChange(''); handleFirstChange(team) }}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-all"
                  style={{
                    background: selected ? `${info.primaryColor}22` : '#0A0A0F',
                    border: selected ? `1px solid ${info.primaryColor}` : '1px solid rgba(255,255,255,0.05)',
                    boxShadow: selected ? `0 0 12px ${info.primaryColor}33` : 'none',
                  }}
                >
                  <span className="font-display font-bold text-xs flex-shrink-0"
                    style={{ color: info.primaryColor }}>{info.abbr}</span>
                  <span className="text-xs text-white truncate">{team.split(' ').slice(-2).join(' ')}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Second place */}
        <div className="px-5 pb-6">
          <div className="text-xs font-body font-semibold uppercase tracking-wider mb-2"
            style={{ color: '#C0C0C0' }}>🥈 Runner-up</div>
          <div className="grid grid-cols-2 gap-2">
            {teams.map(team => {
              const info = getTeamInfo(team)
              const selected = localSecond === team
              const disabledTeam = localFirst === team
              return (
                <button
                  key={team}
                  disabled={disabledTeam}
                  onClick={() => handleSecondChange(team)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-all disabled:opacity-30"
                  style={{
                    background: selected ? `${info.primaryColor}22` : '#0A0A0F',
                    border: selected ? `1px solid ${info.primaryColor}` : '1px solid rgba(255,255,255,0.05)',
                    boxShadow: selected ? `0 0 12px ${info.primaryColor}33` : 'none',
                  }}
                >
                  <span className="font-display font-bold text-xs flex-shrink-0"
                    style={{ color: info.primaryColor }}>{info.abbr}</span>
                  <span className="text-xs text-white truncate">{team.split(' ').slice(-2).join(' ')}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Save */}
        <div className="px-5 pb-8">
          <button
            onClick={onSave}
            disabled={!localFirst || !localSecond || saving}
            className="w-full py-3.5 rounded-2xl text-sm font-body font-semibold disabled:opacity-30 transition-all"
            style={{ background: 'linear-gradient(135deg, #FFD700, #FF6B2B)', color: '#000' }}
          >
            {saving ? 'Saving…' : 'Lock in my prediction →'}
          </button>
        </div>
      </div>
    </div>
  )
}