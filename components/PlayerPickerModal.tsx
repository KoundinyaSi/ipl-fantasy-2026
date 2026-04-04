'use client'

import { createPortal } from 'react-dom'
import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface Player {
  id: string
  name: string
  role: string
  country: string
  player_img: string
}

interface MatchPlayer {
  player_id: string
  team: string
  is_playing_11: boolean
  players: Player
}

interface PlayerPickerModalProps {
  matchId: string
  team1: string
  team2: string
  existingPick?: {
    player_ids: string[]
    captain_id: string
    vice_captain_id: string
  }
  onClose: () => void
  onSave: (playerIds: string[], captainId: string, vcId: string) => Promise<void>
}

const ROLE_ICONS: Record<string, string> = {
  'Batsman': '🏏',
  'Bowler': '⚾',
  'WK-Batsman': '🧤',
  'Batting Allrounder': '⚡',
  'Bowling Allrounder': '⚡',
}

export default function PlayerPickerModal({
  matchId,
  team1,
  team2,
  existingPick,
  onClose,
  onSave,
}: PlayerPickerModalProps) {
  const [matchPlayers, setMatchPlayers] = useState<MatchPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set(existingPick?.player_ids ?? []))
  const [captainId, setCaptainId] = useState<string>(existingPick?.captain_id ?? '')
  const [vcId, setVcId] = useState<string>(existingPick?.vice_captain_id ?? '')
  const [activeTeam, setActiveTeam] = useState<'all' | string>('all')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/fantasy/players?match_id=${matchId}`)
      .then(r => r.json())
      .then(d => { setMatchPlayers(d.players ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [matchId])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const filtered = useMemo(() => {
    if (activeTeam === 'all') return matchPlayers
    return matchPlayers.filter(mp => mp.team === activeTeam)
  }, [matchPlayers, activeTeam])

  const teams = useMemo(() => {
    const t = new Set(matchPlayers.map(mp => mp.team))
    return Array.from(t)
  }, [matchPlayers])

  // Count per team in selection
  const teamCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const pid of Array.from(selected)) {
      const mp = matchPlayers.find(m => m.player_id === pid)
      if (mp) counts[mp.team] = (counts[mp.team] || 0) + 1
    }
    return counts
  }, [selected, matchPlayers])

  function togglePlayer(pid: string, team: string) {
    setError('')
    if (selected.has(pid)) {
      const next = new Set(selected)
      next.delete(pid)
      setSelected(next)
      if (captainId === pid) setCaptainId('')
      if (vcId === pid) setVcId('')
    } else {
      if (selected.size >= 11) { setError('Already have 11 players selected'); return }
      const teamCount = teamCounts[team] || 0
      if (teamCount >= 8) { setError('Maximum 8 players from one team'); return }
      const next = new Set(selected)
      next.add(pid)
      setSelected(next)
    }
  }

  function handleCaptain(pid: string) {
    if (!selected.has(pid)) return
    if (vcId === pid) setVcId('')
    setCaptainId(pid)
  }

  function handleVC(pid: string) {
    if (!selected.has(pid)) return
    if (captainId === pid) setCaptainId('')
    setVcId(pid)
  }

  const canSubmit = selected.size === 11 && captainId && vcId && captainId !== vcId

  async function handleSave() {
    if (!canSubmit) return
    const minTeam = Math.min(...Object.values(teamCounts))
    if (minTeam < 3) { setError('Minimum 3 players from each team'); return }
    setSaving(true)
    try {
      await onSave(Array.from(selected), captainId, vcId)
      onClose()
    } catch (e) {
      setError(String(e))
      setSaving(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: '#0A0A0F' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <button onClick={onClose} className="text-brand-muted p-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <div className="text-center">
          <h2 className="font-display font-bold text-white text-sm">Pick Your Fantasy 11</h2>
          <p className="text-[10px] text-brand-muted">{selected.size}/11 selected</p>
        </div>
        <button
          onClick={handleSave}
          disabled={!canSubmit || saving}
          className="text-xs font-body font-semibold px-3 py-1.5 rounded-xl disabled:opacity-30"
          style={{ background: canSubmit ? 'linear-gradient(135deg, #FF6B2B, #FF8C5A)' : '#1E1E2E', color: '#fff' }}
        >
          {saving ? '…' : 'Save'}
        </button>
      </div>

      {/* Team constraint bar */}
      <div className="px-4 py-2 flex items-center justify-between flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        {teams.map(t => (
          <div key={t} className="text-center">
            <div className="font-display font-bold text-white text-lg">{teamCounts[t] ?? 0}</div>
            <div className="text-[10px] text-brand-muted">{t.split(' ').pop()} (max 8)</div>
          </div>
        ))}
        <div className="text-center">
          <div className="font-display font-bold text-sm" style={{ color: captainId ? '#FFD700' : '#6B6B8A' }}>
            {captainId ? '✓' : '—'}
          </div>
          <div className="text-[10px] text-brand-muted">Captain</div>
        </div>
        <div className="text-center">
          <div className="font-display font-bold text-sm" style={{ color: vcId ? '#C0C0C0' : '#6B6B8A' }}>
            {vcId ? '✓' : '—'}
          </div>
          <div className="text-[10px] text-brand-muted">V. Captain</div>
        </div>
      </div>

      {/* Team filter tabs */}
      <div className="px-4 py-2 flex gap-2 flex-shrink-0">
        {['all', ...teams].map(t => (
          <button
            key={t}
            onClick={() => setActiveTeam(t)}
            className="text-xs px-3 py-1.5 rounded-full font-body font-medium transition-all"
            style={{
              background: activeTeam === t ? '#FF6B2B' : '#1E1E2E',
              color: activeTeam === t ? '#fff' : '#C4C4D4',
            }}
          >
            {t === 'all' ? 'All' : t.split(' ').pop()}
          </button>
        ))}
      </div>

      {error && (
        <div className="px-4 pb-2 text-xs text-red-400 flex-shrink-0">{error}</div>
      )}

      {/* Player list */}
      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: '#FF6B2B33', borderTopColor: '#FF6B2B' }} />
          </div>
        ) : (
          <div className="space-y-2 pt-2">
            {filtered.map(mp => {
              const p = mp.players
              const isSelected = selected.has(mp.player_id)
              const isCap = captainId === mp.player_id
              const isVC = vcId === mp.player_id

              return (
                <div
                  key={mp.player_id}
                  className="rounded-2xl overflow-hidden transition-all"
                  style={{
                    background: isSelected ? 'rgba(255,107,43,0.08)' : '#12121A',
                    border: isSelected ? '1px solid rgba(255,107,43,0.3)' : '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <div className="flex items-center gap-3 p-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0" style={{ background: '#1E1E2E' }}>
                      {p.player_img && !p.player_img.includes('icon512') ? (
                        <Image src={p.player_img} alt={p.name} width={40} height={40} className="w-full h-full object-cover" unoptimized />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg">
                          {ROLE_ICONS[p.role] ?? '🏏'}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-body font-semibold text-sm text-white truncate">{p.name}</span>
                        {isCap && <span className="text-[10px] px-1.5 py-0.5 rounded font-bold flex-shrink-0" style={{ background: '#FFD70022', color: '#FFD700' }}>C</span>}
                        {isVC && <span className="text-[10px] px-1.5 py-0.5 rounded font-bold flex-shrink-0" style={{ background: '#C0C0C022', color: '#C0C0C0' }}>VC</span>}
                        {mp.is_playing_11 && <span className="text-[10px] px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: '#22C55E22', color: '#22C55E' }}>P11</span>}
                      </div>
                      <div className="text-[10px] text-brand-muted mt-0.5">
                        {ROLE_ICONS[p.role]} {p.role} · {mp.team.split(' ').pop()}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {isSelected && (
                        <>
                          <button
                            onClick={() => handleCaptain(mp.player_id)}
                            className="text-[10px] px-2 py-1 rounded-lg font-bold transition-all"
                            style={{
                              background: isCap ? '#FFD700' : '#1E1E2E',
                              color: isCap ? '#000' : '#C4C4D4',
                            }}
                          >C</button>
                          <button
                            onClick={() => handleVC(mp.player_id)}
                            className="text-[10px] px-2 py-1 rounded-lg font-bold transition-all"
                            style={{
                              background: isVC ? '#C0C0C0' : '#1E1E2E',
                              color: isVC ? '#000' : '#C4C4D4',
                            }}
                          >VC</button>
                        </>
                      )}
                      <button
                        onClick={() => togglePlayer(mp.player_id, mp.team)}
                        className={cn(
                          'w-7 h-7 rounded-full flex items-center justify-center text-sm transition-all',
                          isSelected ? 'text-white' : 'text-brand-muted'
                        )}
                        style={{
                          background: isSelected ? '#FF6B2B' : '#1E1E2E',
                        }}
                      >
                        {isSelected ? '✓' : '+'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Bottom hint */}
      <div className="px-4 py-3 flex-shrink-0 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <p className="text-[11px] text-brand-muted">
          Select 11 · Min 3 / Max 8 per team · Tap C/VC to assign captain roles
        </p>
      </div>
    </div>,
    document.body
  )
}