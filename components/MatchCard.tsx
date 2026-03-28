'use client'

import TeamBadge from '@/components/TeamBadge'
import { formatMatchDate, formatRelativeTime, isVotingLocked, getInitials } from '@/lib/utils'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

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
  match_started: boolean
  match_ended: boolean
}

interface MatchCardProps {
  match: Match
  currentUserId: string
  userPrediction: string | null
  allPredictions: Prediction[]
  onVote: (matchId: string, team: string) => Promise<void>
  onUnvote: (matchId: string) => Promise<void>
}

function getCountdown(matchDate: string): string | null {
  const diff = new Date(matchDate).getTime() - Date.now()
  if (diff <= 0 || diff > 24 * 60 * 60 * 1000) return null
  const h = Math.floor(diff / (1000 * 60 * 60))
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const s = Math.floor((diff % (1000 * 60)) / 1000)
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
  return `${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
}

export default function MatchCard({
  match,
  currentUserId,
  userPrediction,
  allPredictions,
  onVote,
  onUnvote,
}: MatchCardProps) {
  const [voting, setVoting] = useState(false)
  const [localPrediction, setLocalPrediction] = useState(userPrediction)
  const [locked, setLocked] = useState(() => isVotingLocked(match.match_date))
  const [showVoters, setShowVoters] = useState(false)
  const [countdown, setCountdown] = useState<string | null>(() => getCountdown(match.match_date))

  useEffect(() => {
    setLocalPrediction(userPrediction)
  }, [userPrediction])

  useEffect(() => {
    const interval = setInterval(() => {
      setLocked(isVotingLocked(match.match_date))
    }, 30_000)
    return () => clearInterval(interval)
  }, [match.match_date])

  // Countdown ticks every second when match is within 24h
  useEffect(() => {
    const msToMatch = new Date(match.match_date).getTime() - Date.now()
    if (msToMatch > 24 * 60 * 60 * 1000) return // more than 24h away — no countdown needed
    const interval = setInterval(() => {
      setCountdown(getCountdown(match.match_date))
    }, 1000)
    return () => clearInterval(interval)
  }, [match.match_date])

  async function handleVote(team: string) {
    if (locked || voting) return
    if (localPrediction === team) {
      setVoting(true)
      try {
        await onUnvote(match.id)
        setLocalPrediction(null)
      } finally {
        setVoting(false)
      }
      return
    }
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
    <>
      <div
        className="glass rounded-2xl overflow-hidden transition-all duration-300"
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
            {match.match_started && !match.match_ended ? (
              <span
                className="text-xs px-2.5 py-1 rounded-full font-body font-medium animate-pulse"
                style={{ background: '#EF444422', color: '#EF4444', border: '1px solid #EF444433' }}
              >
                🔴 Live
              </span>
            ) : locked ? (
              <span
                className="text-xs px-2.5 py-1 rounded-full font-body font-medium"
                style={{ background: '#6B6B8A22', color: '#C4C4D4', border: '1px solid #6B6B8A33' }}
              >
                🔒 Locked
              </span>
            ) : countdown ? (
              <span
                className="text-xs px-2.5 py-1 rounded-full font-body font-medium tabular-nums"
                style={{ background: '#FF6B2B22', color: '#FF6B2B', border: '1px solid #FF6B2B44' }}
              >
                ⏱ {countdown}
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
            <span className="font-display font-bold text-lg text-brand-muted" style={{ letterSpacing: '0.05em' }}>
              VS
            </span>
            {localPrediction && !locked && (
              <div className="text-xs text-brand-muted/60 text-center">tap again to unselect</div>
            )}
            {localPrediction && locked && (
              <div className="text-xs text-brand-muted/60 text-center">vote locked in</div>
            )}
            {!localPrediction && !locked && (
              <div className="text-xs text-brand-muted/60 text-center">tap to vote</div>
            )}
            {!localPrediction && locked && (
              <div className="text-xs text-red-400/70 text-center">no pick placed</div>
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

        {/* Vote bar — tap to see who voted */}
        {totalVotes > 0 && (
          <button
            className="w-full px-4 pb-4 focus:outline-none"
            onClick={() => setShowVoters(true)}
            aria-label="See who voted"
          >
            {/* Bar */}
            <div
              className="h-2 rounded-full overflow-hidden flex transition-all"
              style={{ background: '#1E1E2E' }}
            >
              <div
                className="h-full rounded-l-full transition-all duration-500"
                style={{ width: `${team1Pct}%`, background: 'linear-gradient(90deg, #FF6B2B, #FF8C5A)' }}
              />
              <div
                className="h-full rounded-r-full transition-all duration-500"
                style={{ width: `${team2Pct}%`, background: '#3A3A5A' }}
              />
            </div>

            {/* Labels */}
            <div className="flex justify-between mt-1.5">
              <span className="text-xs text-brand-muted">{team1Pct}%</span>
              <span className="text-xs text-brand-muted/50 flex items-center gap-1">
                {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
                <span className="text-[10px] text-brand-muted/30">· tap to see</span>
              </span>
              <span className="text-xs text-brand-muted">{team2Pct}%</span>
            </div>
          </button>
        )}

        {voting && (
          <div
            className="px-4 py-2 text-center text-xs text-brand-muted animate-pulse"
            style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
          >
            Saving…
          </div>
        )}
      </div>

      {/* Bottom sheet voter breakdown — rendered via portal so fixed positioning is relative to viewport, not card */}
      {showVoters && typeof window !== 'undefined' && createPortal(
        <VoterBottomSheet
          match={match}
          team1Voters={team1Voters}
          team2Voters={team2Voters}
          currentUserId={currentUserId}
          onClose={() => setShowVoters(false)}
        />
        , document.body)}
    </>
  )
}

function VoterBottomSheet({
  match,
  team1Voters,
  team2Voters,
  currentUserId,
  onClose,
}: {
  match: Match
  team1Voters: Prediction[]
  team2Voters: Prediction[]
  currentUserId: string
  onClose: () => void
}) {
  const sheetRef = useRef<HTMLDivElement>(null)

  // Close on backdrop tap
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    // Prevent body scroll
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={sheetRef}
        className="w-full rounded-t-3xl animate-in"
        style={{
          background: '#12121A',
          border: '1px solid rgba(255,255,255,0.08)',
          maxHeight: '75vh',
          overflowY: 'auto',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: '#2E2E3E' }} />
        </div>

        {/* Header */}
        <div className="px-5 pt-2 pb-4 flex items-center justify-between">
          <div>
            <h3 className="font-display font-bold text-white text-base">Who voted what</h3>
            <p className="text-xs text-brand-muted mt-0.5">
              {match.team1.split(' ').pop()} vs {match.team2.split(' ').pop()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-brand-muted"
            style={{ background: '#1E1E2E' }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Two columns */}
        <div className="px-5 pb-8 grid grid-cols-2 gap-4">
          <VoterColumn
            teamName={match.team1}
            voters={team1Voters}
            currentUserId={currentUserId}
          />
          <VoterColumn
            teamName={match.team2}
            voters={team2Voters}
            currentUserId={currentUserId}
          />
        </div>
      </div>
    </div>
  )
}

function VoterColumn({
  teamName,
  voters,
  currentUserId,
}: {
  teamName: string
  voters: Prediction[]
  currentUserId: string
}) {
  return (
    <div>
      <div
        className="text-xs font-body font-semibold mb-3 pb-2"
        style={{ color: '#E8E8F0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        {teamName.split(' ').pop()}
        <span className="text-brand-muted font-normal ml-1">({voters.length})</span>
      </div>

      {voters.length === 0 ? (
        <p className="text-xs text-brand-muted/40 italic">No votes yet</p>
      ) : (
        <div className="space-y-2.5">
          {voters.map((v) => {
            const isMe = v.user_id === currentUserId
            return (
              <div key={v.user_id} className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                  {v.profiles.avatar_url ? (
                    <Image
                      src={v.profiles.avatar_url}
                      alt={v.profiles.name}
                      width={28}
                      height={28}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-[9px] font-bold text-white"
                      style={{ background: isMe ? '#FF6B2B' : '#3A3A5A' }}
                    >
                      {getInitials(v.profiles.name)}
                    </div>
                  )}
                </div>
                <span
                  className="text-xs font-body truncate"
                  style={{ color: isMe ? '#FF6B2B' : '#E8E8F0' }}
                >
                  {isMe ? 'You' : v.profiles.name.split(' ')[0]}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}