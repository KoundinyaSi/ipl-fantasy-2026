import { getInitials } from '@/lib/utils'
import Image from 'next/image'

interface LeaderboardEntry {
  id: string
  name: string
  avatar_url: string | null
  total_points: number
  correct_predictions: number
  total_predictions: number
  voting_streak: number
}

interface LeaderboardProps {
  entries: LeaderboardEntry[]
  currentUserId: string
}

const STREAK_TAUNTS = [
  'ice cold 🧊',
  'just vibing',
  'needs help',
  'touch grass',
  'pick a side bro',
]

const ACCURACY_TAUNTS: { max: number; label: string }[] = [
  { max: 20, label: 'just guessing 💀' },
  { max: 35, label: 'worse than random' },
  { max: 50, label: 'coin flip energy' },
  { max: 65, label: 'room for growth' },
  { max: 80, label: 'not bad actually' },
  { max: 100, label: 'oracle mode 🔮' },
]

function getAccuracyTaunt(accuracy: number) {
  return ACCURACY_TAUNTS.find((t) => accuracy <= t.max)?.label ?? 'oracle mode 🔮'
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
        const onDoublePoints = entry.voting_streak >= 3
        const rankColor =
          rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : rank === 3 ? '#CD7F32' : '#E8E8F0'

        return (
          <div
            key={entry.id}
            className="glass rounded-2xl overflow-hidden transition-all duration-200"
            style={{
              border: isMe
                ? '1px solid rgba(255, 107, 43, 0.3)'
                : onDoublePoints
                  ? '1px solid rgba(255, 215, 0, 0.15)'
                  : '1px solid rgba(255,255,255,0.05)',
              background: isMe ? 'rgba(255, 107, 43, 0.04)' : undefined,
            }}
          >
            {/* Double points banner */}
            {onDoublePoints && (
              <div
                className="px-4 py-1.5 flex items-center gap-2 text-[11px] font-body font-medium"
                style={{
                  background: 'linear-gradient(90deg, rgba(255,215,0,0.12), rgba(255,107,43,0.08))',
                  borderBottom: '1px solid rgba(255,215,0,0.1)',
                  color: '#FFD700',
                }}
              >
                <span>⚡</span>
                <span>
                  {entry.voting_streak} match streak — earning <strong>+2 pts</strong> per correct pick
                </span>
              </div>
            )}

            {/* Top row */}
            <div className="px-4 pt-3.5 pb-2 flex items-center gap-3">
              {/* Rank */}
              <div className="w-7 flex-shrink-0 text-center">
                {rank <= 3 ? (
                  <span className="text-xl leading-none">{['🥇', '🥈', '🥉'][rank - 1]}</span>
                ) : (
                  <span className="font-display font-bold text-sm" style={{ color: '#6B6B8A' }}>
                    {rank}
                  </span>
                )}
              </div>

              {/* Avatar */}
              <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
                {entry.avatar_url ? (
                  <Image
                    src={entry.avatar_url}
                    alt={entry.name}
                    width={36}
                    height={36}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-xs font-display font-bold text-white"
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

              {/* Name */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
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
                <div className="text-[10px] text-brand-muted/40 mt-0.5">
                  {entry.correct_predictions} correct / {entry.total_predictions} picks
                </div>
              </div>

              {/* Points */}
              <div className="text-right flex-shrink-0">
                <div className="font-display font-bold text-2xl leading-none" style={{ color: rankColor }}>
                  {entry.total_points}
                </div>
                <div className="text-[10px] text-brand-muted/50 mt-0.5">
                  {onDoublePoints ? '⚡ pts' : 'pts'}
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div
              className="px-4 pb-3 flex items-center gap-2"
              style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
            >
              <StatPill
                value={accuracy !== null ? `${accuracy}%` : '—'}
                label="accuracy"
                sublabel={accuracy !== null ? getAccuracyTaunt(accuracy) : 'no picks yet'}
                color={
                  accuracy === null ? '#6B6B8A'
                    : accuracy >= 65 ? '#22C55E'
                      : accuracy >= 40 ? '#F59E0B'
                        : '#EF4444'
                }
              />

              <div className="w-px h-6 flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }} />

              <StatPill
                value={entry.voting_streak > 0 ? `${entry.voting_streak}` : '—'}
                label="match streak"
                sublabel={
                  entry.voting_streak >= 5 ? 'on fire 🔥🔥'
                    : entry.voting_streak >= 3 ? '⚡ double pts active'
                      : entry.voting_streak >= 1 ? 'keep going'
                        : STREAK_TAUNTS[Math.floor(Math.random() * STREAK_TAUNTS.length)]
                }
                color={
                  entry.voting_streak >= 3 ? '#FFD700'
                    : entry.voting_streak >= 1 ? '#22C55E'
                      : '#6B6B8A'
                }
                icon={entry.voting_streak >= 3 ? '⚡' : entry.voting_streak > 0 ? '🔥' : undefined}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function StatPill({
  value,
  label,
  sublabel,
  color,
  icon,
}: {
  value: string
  label: string
  sublabel: string
  color: string
  icon?: string
}) {
  return (
    <div className="flex items-center gap-2 flex-1 min-w-0 py-1.5">
      <div
        className="text-sm font-display font-bold flex-shrink-0 flex items-center gap-1"
        style={{ color }}
      >
        {icon && <span className="text-sm">{icon}</span>}
        {value}
      </div>
      <div className="min-w-0">
        <div className="text-[10px] text-brand-muted/50 uppercase tracking-wider leading-none">{label}</div>
        <div className="text-[10px] text-brand-muted/70 mt-0.5 truncate">{sublabel}</div>
      </div>
    </div>
  )
}