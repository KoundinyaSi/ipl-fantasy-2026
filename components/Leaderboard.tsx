import { getInitials } from '@/lib/utils'
import Image from 'next/image'

interface LeaderboardEntry {
  id: string
  name: string
  avatar_url: string | null
  correct_predictions: number
  total_predictions: number
  voting_streak: number
}

interface LeaderboardProps {
  entries: LeaderboardEntry[]
  currentUserId: string
}

export default function Leaderboard({ entries, currentUserId }: LeaderboardProps) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-4xl mb-4">🏏</div>
        <p className="text-brand-muted text-sm">No predictions yet.</p>
        <p className="text-brand-muted/60 text-xs mt-1">Make picks on upcoming matches to appear here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {entries.map((entry, index) => {
        const rank = index + 1
        const isMe = entry.id === currentUserId
        const accuracy =
          entry.total_predictions > 0
            ? Math.round((entry.correct_predictions / entry.total_predictions) * 100)
            : null

        return (
          <div
            key={entry.id}
            className="glass rounded-2xl px-4 py-3.5 flex items-center gap-4 transition-all duration-200"
            style={{
              border: isMe
                ? '1px solid rgba(255, 107, 43, 0.3)'
                : '1px solid rgba(255,255,255,0.05)',
              background: isMe ? 'rgba(255, 107, 43, 0.05)' : undefined,
            }}
          >
            {/* Rank */}
            <div className="w-8 flex-shrink-0 text-center">
              {rank <= 3 ? (
                <span className="text-xl">{['🥇', '🥈', '🥉'][rank - 1]}</span>
              ) : (
                <span
                  className="font-display font-bold text-sm"
                  style={{ color: rank <= 3 ? '#FFD700' : '#6B6B8A' }}
                >
                  {rank}
                </span>
              )}
            </div>

            {/* Avatar */}
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
              {entry.avatar_url ? (
                <Image
                  src={entry.avatar_url}
                  alt={entry.name}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-sm font-display font-bold text-white"
                  style={{
                    background: isMe
                      ? 'linear-gradient(135deg, #FF6B2B, #FFD700)'
                      : 'linear-gradient(135deg, #2A2A3A, #3A3A5A)',
                  }}
                >
                  {getInitials(entry.name)}
                </div>
              )}
            </div>

            {/* Name + streak */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`font-body font-semibold text-sm truncate ${isMe ? 'text-white' : 'text-white/90'}`}>
                  {entry.name.split(' ')[0]}
                </span>
                {isMe && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full font-body font-medium flex-shrink-0"
                    style={{ background: '#FF6B2B22', color: '#FF6B2B', border: '1px solid #FF6B2B33' }}
                  >
                    You
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {entry.voting_streak > 0 && (
                  <span className="text-[10px] text-brand-muted/70">
                    🔥 {entry.voting_streak} streak
                  </span>
                )}
                {accuracy !== null && (
                  <span className="text-[10px] text-brand-muted/50">
                    {accuracy}% accuracy
                  </span>
                )}
              </div>
            </div>

            {/* Points */}
            <div className="text-right flex-shrink-0">
              <div
                className="font-display font-bold text-xl"
                style={{
                  color: rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : rank === 3 ? '#CD7F32' : '#E8E8F0',
                }}
              >
                {entry.correct_predictions}
              </div>
              <div className="text-[10px] text-brand-muted/50">pts</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
