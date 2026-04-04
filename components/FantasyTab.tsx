'use client'

import { useState, useEffect, useCallback } from 'react'
import FantasyMatchCard from './FantasyMatchCard'
import FantasyLeaderboard from './FantasyLeaderboard'

interface Match {
  id: string
  team1: string
  team2: string
  match_date: string
  match_ended: boolean
  match_started: boolean
}

interface PickPlayer {
  player_id: string
  is_captain: boolean
  is_vice_captain: boolean
  is_substitute: boolean
  fantasy_points: number
  points_earned: number
  players: any
  [key: string]: any
}

interface FantasyPick {
  id: string
  match_id: string
  captain_id: string
  vice_captain_id: string
  total_fantasy_points: number
  sub_used: boolean
  fantasy_pick_players: PickPlayer[]
}

interface FantasyEntry {
  id: string
  name: string
  avatar_url: string | null
  total_fantasy_points: number
  matches_played: number
}

interface FantasyTabProps {
  matches: Match[]
  currentUserId: string
}

type SubTab = 'picks' | 'leaderboard'

export default function FantasyTab({ matches, currentUserId }: FantasyTabProps) {
  const [subTab, setSubTab] = useState<SubTab>('picks')
  const [myPicks, setMyPicks] = useState<FantasyPick[]>([])
  const [matchPlayersMap, setMatchPlayersMap] = useState<Record<string, object[]>>({})
  const [leaderboard, setLeaderboard] = useState<FantasyEntry[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    const [picksRes, lbRes] = await Promise.all([
      fetch('/api/fantasy/picks').then(r => r.json()),
      fetch('/api/fantasy/leaderboard').then(r => r.json()),
    ])
    setMyPicks(picksRes.picks ?? [])
    setLeaderboard(lbRes.leaderboard ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Lazy load match players for matches that are visible
  useEffect(() => {
    for (const match of matches) {
      if (matchPlayersMap[match.id]) continue
      fetch(`/api/fantasy/players?match_id=${match.id}`)
        .then(r => r.json())
        .then(d => {
          setMatchPlayersMap(prev => ({ ...prev, [match.id]: d.players ?? [] }))
        })
        .catch(() => { })
    }
  }, [matches, matchPlayersMap])

  const allMatches = [...matches].sort((a, b) =>
    new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
  )
  const upcomingMatches = allMatches.filter(m => !m.match_ended)
  const completedMatches = allMatches.filter(m => m.match_ended).reverse()

  return (
    <div className="animate-in">
      {/* Sub-tabs */}
      <div className="flex gap-2 mb-4">
        {(['picks', 'leaderboard'] as SubTab[]).map(t => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className="flex-1 py-2 rounded-xl text-sm font-body font-medium transition-all capitalize"
            style={{
              background: subTab === t ? '#FF6B2B' : '#12121A',
              color: subTab === t ? '#fff' : '#C4C4D4',
              border: subTab === t ? 'none' : '1px solid rgba(255,255,255,0.05)',
            }}
          >
            {t === 'picks' ? '⚡ My Picks' : '🏆 Standings'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: '#FF6B2B33', borderTopColor: '#FF6B2B' }} />
        </div>
      ) : subTab === 'leaderboard' ? (
        <FantasyLeaderboard entries={leaderboard} currentUserId={currentUserId} />
      ) : (
        <div className="space-y-4">
          {upcomingMatches.length > 0 && (
            <div>
              <h3 className="text-xs font-body font-semibold text-brand-muted uppercase tracking-wider mb-3">Upcoming</h3>
              <div className="space-y-3">
                {upcomingMatches.map(match => (
                  <FantasyMatchCard
                    key={match.id}
                    match={match}
                    myPick={myPicks.find(p => p.match_id === match.id) ?? null}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    matchPlayers={(matchPlayersMap[match.id] ?? []) as any}
                    onPickSaved={loadData}
                  />
                ))}
              </div>
            </div>
          )}

          {completedMatches.length > 0 && (
            <div>
              <h3 className="text-xs font-body font-semibold text-brand-muted uppercase tracking-wider mb-3">Completed</h3>
              <div className="space-y-3">
                {completedMatches.map(match => (
                  <FantasyMatchCard
                    key={match.id}
                    match={match}
                    myPick={myPicks.find(p => p.match_id === match.id) ?? null}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    matchPlayers={(matchPlayersMap[match.id] ?? []) as any}
                    onPickSaved={loadData}
                  />
                ))}
              </div>
            </div>
          )}

          {allMatches.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-4xl mb-4">⚡</div>
              <p className="text-brand-muted text-sm">No matches yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}