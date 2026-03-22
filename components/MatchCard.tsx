'use client'

import TeamBadge from '@/components/TeamBadge'
import { formatMatchDate, formatRelativeTime, isVotingLocked } from '@/lib/utils'
import { useEffect, useState } from 'react'
import { getInitials } from '@/lib/utils'
import Image from 'next/image'

interface Prediction {
  user_id: string
  predicted_team: string
  profiles: {
    id: string
    name: string
    avatar_url: string | null
  }
}

interface Match {
  id: string
  team1: string
  team2: string
  venue: string
  match_date: string
  status: string
}

interface MatchCardProps {
  match: Match
  currentUserId: string
  userPrediction: string | null
  allPredictions: Prediction[]
  onVote: (matchId: string, team: string) => Promise<void>
}

export default function MatchCard({
  match,
  currentUserId,
  userPrediction,
  allPredictions,
  onVote,
}: MatchCardProps) {
  const [voting, setVoting] = useState(false)
  const [localPrediction, setLocalPrediction] = useState(userPrediction)
  const [locked, setLocked] = useState(() => isVotingLocked(match.match_date))

  // Re-check lock every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setLocked(isVotingLocked(match.match_date))
    }, 30_000)
    return () => clearInterval(interval)
  }, [match.match_date])

  async function handleVote(team: string) {
    if (locked || voting) return
    setVoting(true)
    try {
      await onVote(match.id, team)
      setLocalPrediction(team)
    } finally {
      setVoting(false)
    }
  }

  const team1Voters = allPredictions.filter((p) => p.predicted_team === match.team1)
  const team2Voters = allPredictions.filter((p) => p.predicted_team === match.team2)
  const totalVotes = allPredictions.length

  const team1Pct = totalVotes > 0 ? Math.round((team1Voters.length / totalVotes) * 100) : 50
  const team2Pct = 100 - team1Pct

  return (
    <div
      className="glass rounded-2xl overflow-hidden transition-all duration-300 hover:border-white/10"
      style={{ border: '1px solid rgba(255,255,255,0.05)' }}
    >
      {/* Match header */}
      <div className="px-4 pt-4 pb-2 flex items-start justify-between gap-2">
        <div>
          <div className="text-xs text-brand-muted font-body">{formatMatchDate(match.match_date)}</div>
          {match.venue && (
            <div className="text-xs text-brand-muted/50 mt-0.5 truncate max-w-[200px]">📍 {match.venue}</div>
          )}
        </div>
        <div className="flex-shrink-0">
          {locked ? (
            <span
              className="text-xs px-2.5 py-1 rounded-full font-body font-medium"
              style={{ background: '#EF444422', color: '#EF4444', border: '1px solid #EF444433' }}
            >
              🔒 Locked
            </span>
          ) : (
            <span
              className="text-xs px-2.5 py-1 rounded-full font-body font-medium"
              style={{ background: '#22C55E22', color: '#22C55E', border: '1px solid #22C55E33' }}
            >
              🟢 {formatRelativeTime(match.match_date)}
            </span>
          )}
        </div>
      </div>

      {/* Teams voting area */}
      <div className="px-4 py-4 flex items-center justify-between gap-4">
        <TeamBadge
          team={match.team1}
          size="lg"
          selected={localPrediction === match.team1}
          locked={locked || voting}
          onClick={() => handleVote(match.team1)}
        />

        <div className="flex flex-col items-center gap-1 flex-1">
          <span
            className="font-display font-bold text-lg text-brand-muted"
            style={{ letterSpacing: '0.05em' }}
          >
            VS
          </span>
          {localPrediction && (
            <div className="text-xs text-brand-muted/60 text-center">
              {locked ? 'Vote locked in' : 'Your pick (tap to change)'}
            </div>
          )}
          {!localPrediction && !locked && (
            <div className="text-xs text-brand-muted/60 text-center">
              Tap a team to vote
            </div>
          )}
          {!localPrediction && locked && (
            <div className="text-xs text-red-400/70 text-center">
              No prediction placed
            </div>
          )}
        </div>

        <TeamBadge
          team={match.team2}
          size="lg"
          selected={localPrediction === match.team2}
          locked={locked || voting}
          onClick={() => handleVote(match.team2)}
        />
      </div>

      {/* Vote bar */}
      {totalVotes > 0 && (
        <div className="px-4 pb-3">
          <div className="h-1.5 rounded-full overflow-hidden flex" style={{ background: '#1E1E2E' }}>
            <div
              className="h-full rounded-l-full transition-all duration-500"
              style={{ width: `${team1Pct}%`, background: 'linear-gradient(90deg, #FF6B2B, #FF8C5A)' }}
            />
            <div
              className="h-full rounded-r-full transition-all duration-500"
              style={{ width: `${team2Pct}%`, background: '#3A3A5A' }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-brand-muted">{team1Pct}%</span>
            <span className="text-xs text-brand-muted">{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
            <span className="text-xs text-brand-muted">{team2Pct}%</span>
          </div>
        </div>
      )}

      {/* Who voted for what */}
      {totalVotes > 0 && (
        <div
          className="px-4 py-3 flex items-start justify-between gap-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
        >
          <VoterAvatars
            voters={team1Voters}
            currentUserId={currentUserId}
          />
          <VoterAvatars
            voters={team2Voters}
            currentUserId={currentUserId}
            align="right"
          />
        </div>
      )}

      {voting && (
        <div
          className="px-4 py-2 text-center text-xs text-brand-muted animate-pulse"
          style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
        >
          Saving your pick…
        </div>
      )}
    </div>
  )
}

function VoterAvatars({
  voters,
  currentUserId,
  align = 'left',
}: {
  voters: Prediction[]
  currentUserId: string
  align?: 'left' | 'right'
}) {
  if (voters.length === 0) return <div className="flex-1" />

  const MAX_SHOW = 4
  const shown = voters.slice(0, MAX_SHOW)
  const overflow = voters.length - MAX_SHOW

  return (
    <div className={`flex flex-col gap-1 flex-1 ${align === 'right' ? 'items-end' : 'items-start'}`}>
      <div className="flex items-center" style={{ direction: align === 'right' ? 'rtl' : 'ltr' }}>
        {shown.map((v, i) => (
          <div
            key={v.user_id}
            className="w-6 h-6 rounded-full overflow-hidden ring-1 ring-brand-dark flex-shrink-0"
            style={{ marginLeft: i > 0 ? (align === 'right' ? '2px' : '-6px') : 0, zIndex: shown.length - i }}
            title={v.profiles.name}
          >
            {v.profiles.avatar_url ? (
              <Image
                src={v.profiles.avatar_url}
                alt={v.profiles.name}
                width={24}
                height={24}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-[8px] font-bold text-white"
                style={{ background: v.user_id === currentUserId ? '#FF6B2B' : '#3A3A5A' }}
              >
                {getInitials(v.profiles.name)}
              </div>
            )}
          </div>
        ))}
        {overflow > 0 && (
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-brand-muted ring-1 ring-brand-dark"
            style={{ background: '#1E1E2E', marginLeft: '-6px' }}
          >
            +{overflow}
          </div>
        )}
      </div>
      <div className="text-[10px] text-brand-muted/50">
        {voters.length} pick{voters.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
