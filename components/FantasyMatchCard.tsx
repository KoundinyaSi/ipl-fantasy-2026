'use client'

import { useState } from 'react'
import Image from 'next/image'
import { formatMatchDate, isVotingLocked, getInitials } from '@/lib/utils'
import PlayerPickerModal from './PlayerPickerModal'

interface Player {
  id: string
  name: string
  role: string
  player_img: string
}

interface PickPlayer {
  player_id: string
  is_captain: boolean
  is_vice_captain: boolean
  is_substitute: boolean
  points_earned: number
  players: Player
}

interface FantasyPick {
  id: string
  captain_id: string
  vice_captain_id: string
  total_fantasy_points: number
  sub_used: boolean
  fantasy_pick_players: PickPlayer[]
}

interface MatchPlayerEntry {
  player_id: string
  team: string
  is_playing_11: boolean
  playing_11_confirmed_at: string | null
  players: Player
}

interface Match {
  id: string
  team1: string
  team2: string
  match_date: string
  match_ended: boolean
  match_started: boolean
}

interface FantasyMatchCardProps {
  match: Match
  myPick: FantasyPick | null
  matchPlayers: MatchPlayerEntry[]
  onPickSaved: () => void
}

export default function FantasyMatchCard({
  match,
  myPick,
  matchPlayers,
  onPickSaved,
}: FantasyMatchCardProps) {
  const [showPicker, setShowPicker] = useState(false)
  const [showTeam, setShowTeam] = useState(false)
  const locked = isVotingLocked(match.match_date)

  // Sub availability
  const playing11ConfirmedAt = matchPlayers.find(mp => mp.is_playing_11)?.playing_11_confirmed_at
  const subWindowOpen = playing11ConfirmedAt
    ? Date.now() - new Date(playing11ConfirmedAt).getTime() < 60 * 60 * 1000
    : false
  const hasNonPlayingSelected = myPick?.fantasy_pick_players.some(pp => {
    const mp = matchPlayers.find(m => m.player_id === pp.player_id)
    return mp && !mp.is_playing_11 && playing11ConfirmedAt
  })
  const canSub = subWindowOpen && hasNonPlayingSelected && !myPick?.sub_used

  async function handleSave(playerIds: string[], captainId: string, vcId: string) {
    const res = await fetch('/api/fantasy/picks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ match_id: match.id, player_ids: playerIds, captain_id: captainId, vice_captain_id: vcId }),
    })
    if (!res.ok) {
      const d = await res.json()
      throw new Error(d.error)
    }
    onPickSaved()
  }

  return (
    <>
      <div className="glass rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
        {/* Sub available banner */}
        {canSub && (
          <div className="px-4 py-2 flex items-center gap-2 text-xs font-body font-medium"
            style={{ background: 'rgba(234,179,8,0.1)', borderBottom: '1px solid rgba(234,179,8,0.15)', color: '#EAB308' }}>
            <span>⚠️</span>
            <span>A player in your team isn't in playing 11 — sub available</span>
          </div>
        )}

        {/* Match info */}
        <div className="px-4 pt-4 pb-3">
          <div className="text-xs text-brand-muted mb-1">{formatMatchDate(match.match_date)}</div>
          <div className="flex items-center justify-between">
            <div className="font-display font-bold text-white text-sm">
              {match.team1.split(' ').pop()} vs {match.team2.split(' ').pop()}
            </div>
            {match.match_ended && myPick && (
              <div className="font-display font-bold text-xl" style={{ color: '#FFD700' }}>
                {myPick.total_fantasy_points} pts
              </div>
            )}
          </div>
        </div>

        {/* CTA or team preview */}
        <div className="px-4 pb-4" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          {!myPick ? (
            locked ? (
              <div className="pt-3 text-center text-xs text-brand-muted">
                🔒 Picks locked — you didn't select a team
              </div>
            ) : (
              <button
                onClick={() => setShowPicker(true)}
                className="w-full mt-3 py-3 rounded-2xl text-sm font-body font-semibold text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #FF6B2B, #FF8C5A)', boxShadow: '0 4px 20px rgba(255,107,43,0.3)' }}
              >
                ⚡ Pick Your Fantasy 11
              </button>
            )
          ) : (
            <div className="pt-3">
              {/* Captain/VC summary */}
              <div className="flex items-center gap-3 mb-3">
                <PlayerChip
                  player={myPick.fantasy_pick_players.find(pp => pp.is_captain)?.players ?? null}
                  label="C"
                  labelColor="#FFD700"
                  points={match.match_ended ? myPick.fantasy_pick_players.find(pp => pp.is_captain)?.points_earned : undefined}
                />
                <PlayerChip
                  player={myPick.fantasy_pick_players.find(pp => pp.is_vice_captain)?.players ?? null}
                  label="VC"
                  labelColor="#C0C0C0"
                  points={match.match_ended ? myPick.fantasy_pick_players.find(pp => pp.is_vice_captain)?.points_earned : undefined}
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowTeam(v => !v)}
                  className="flex-1 py-2 rounded-xl text-xs font-body font-medium text-brand-muted transition-all"
                  style={{ background: '#1E1E2E' }}
                >
                  {showTeam ? 'Hide team' : `View all 11`}
                </button>
                {!locked && !match.match_ended && (
                  <button
                    onClick={() => setShowPicker(true)}
                    className="flex-1 py-2 rounded-xl text-xs font-body font-medium transition-all"
                    style={{ background: '#FF6B2B22', color: '#FF6B2B' }}
                  >
                    Edit picks
                  </button>
                )}
              </div>

              {/* Full team list */}
              {showTeam && (
                <div className="mt-3 space-y-1.5">
                  {myPick.fantasy_pick_players.map(pp => (
                    <div key={pp.player_id} className="flex items-center gap-2 px-2 py-1.5 rounded-xl"
                      style={{ background: '#0A0A0F' }}>
                      <div className="w-6 h-6 rounded-lg overflow-hidden flex-shrink-0" style={{ background: '#1E1E2E' }}>
                        {pp.players.player_img && !pp.players.player_img.includes('icon512') ? (
                          <Image src={pp.players.player_img} alt={pp.players.name} width={24} height={24} className="w-full h-full object-cover" unoptimized />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px]">🏏</div>
                        )}
                      </div>
                      <span className="flex-1 text-xs text-white truncate">{pp.players.name}</span>
                      {pp.is_captain && <span className="text-[10px] font-bold" style={{ color: '#FFD700' }}>C</span>}
                      {pp.is_vice_captain && <span className="text-[10px] font-bold" style={{ color: '#C0C0C0' }}>VC</span>}
                      {pp.is_substitute && <span className="text-[10px]" style={{ color: '#22C55E' }}>SUB</span>}
                      {match.match_ended && (
                        <span className="text-xs font-display font-bold" style={{ color: pp.points_earned > 0 ? '#22C55E' : '#C4C4D4' }}>
                          {pp.points_earned}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showPicker && (
        <PlayerPickerModal
          matchId={match.id}
          team1={match.team1}
          team2={match.team2}
          existingPick={myPick ? {
            player_ids: myPick.fantasy_pick_players.map(pp => pp.player_id),
            captain_id: myPick.captain_id,
            vice_captain_id: myPick.vice_captain_id,
          } : undefined}
          onClose={() => setShowPicker(false)}
          onSave={handleSave}
        />
      )}
    </>
  )
}

function PlayerChip({ player, label, labelColor, points }: {
  player: Player | null
  label: string
  labelColor: string
  points?: number
}) {
  if (!player) return null
  return (
    <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded-xl" style={{ background: '#0A0A0F' }}>
      <div className="w-7 h-7 rounded-lg overflow-hidden flex-shrink-0" style={{ background: '#1E1E2E' }}>
        {player.player_img && !player.player_img.includes('icon512') ? (
          <Image src={player.player_img} alt={player.name} width={28} height={28} className="w-full h-full object-cover" unoptimized />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sm font-bold" style={{ color: labelColor }}>
            {getInitials(player.name)}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-body font-semibold text-white truncate">{player.name.split(' ').pop()}</div>
        <div className="text-[10px] font-bold" style={{ color: labelColor }}>{label}</div>
      </div>
      {points !== undefined && (
        <div className="text-sm font-display font-bold" style={{ color: points > 0 ? '#22C55E' : '#C4C4D4' }}>
          {points}
        </div>
      )}
    </div>
  )
}