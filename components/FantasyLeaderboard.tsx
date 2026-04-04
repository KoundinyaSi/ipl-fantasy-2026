import { getInitials } from '@/lib/utils'
import Image from 'next/image'

interface FantasyEntry {
  id: string
  name: string
  avatar_url: string | null
  total_fantasy_points: number
  matches_played: number
}

export default function FantasyLeaderboard({
  entries,
  currentUserId,
}: {
  entries: FantasyEntry[]
  currentUserId: string
}) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-4xl mb-4">⚡</div>
        <p className="text-brand-muted text-sm">No fantasy picks yet.</p>
        <p className="text-brand-muted/60 text-xs mt-1">Pick your team before the next match.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {entries.map((entry, index) => {
        const rank = index + 1
        const isMe = entry.id === currentUserId
        const avg = entry.matches_played > 0
          ? Math.round(entry.total_fantasy_points / entry.matches_played)
          : 0
        const rankColor = rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : rank === 3 ? '#CD7F32' : '#E8E8F0'

        return (
          <div
            key={entry.id}
            className="glass rounded-2xl px-4 py-3.5 flex items-center gap-3 transition-all"
            style={{
              border: isMe ? '1px solid rgba(255,107,43,0.3)' : '1px solid rgba(255,255,255,0.05)',
              background: isMe ? 'rgba(255,107,43,0.04)' : undefined,
            }}
          >
            <div className="w-7 flex-shrink-0 text-center">
              {rank <= 3
                ? <span className="text-xl">{['🥇', '🥈', '🥉'][rank - 1]}</span>
                : <span className="font-display font-bold text-sm text-brand-muted">{rank}</span>
              }
            </div>

            <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
              {entry.avatar_url ? (
                <Image src={entry.avatar_url} alt={entry.name} width={36} height={36} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs font-display font-bold text-white"
                  style={{ background: isMe ? 'linear-gradient(135deg,#FF6B2B,#FFD700)' : 'linear-gradient(135deg,#2A2A3A,#3A3A5A)' }}>
                  {getInitials(entry.name)}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-body font-semibold text-sm text-white truncate">{entry.name.split(' ')[0]}</span>
                {isMe && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-body font-medium flex-shrink-0"
                    style={{ background: '#FF6B2B22', color: '#FF6B2B', border: '1px solid #FF6B2B33' }}>You</span>
                )}
              </div>
              <div className="text-[10px] text-brand-muted/70 mt-0.5">
                {entry.matches_played} match{entry.matches_played !== 1 ? 'es' : ''} · avg {avg} pts
              </div>
            </div>

            <div className="text-right flex-shrink-0">
              <div className="font-display font-bold text-2xl leading-none" style={{ color: rankColor }}>
                {entry.total_fantasy_points}
              </div>
              <div className="text-[10px] text-brand-muted/50 mt-0.5">pts</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}