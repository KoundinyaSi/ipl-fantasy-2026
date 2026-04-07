import TeamBadge from '@/components/TeamBadge'
import { formatMatchDate } from '@/lib/utils'
import Image from 'next/image'
import { getInitials } from '@/lib/utils'

interface Prediction {
  user_id: string
  predicted_team: string
  is_correct: boolean | null
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
  winner: string | null
  status: string
}

interface ResultCardProps {
  match: Match
  currentUserId: string
  allPredictions: Prediction[]
}

export default function ResultCard({ match, currentUserId, allPredictions }: ResultCardProps) {
  const myPrediction = allPredictions.find((p) => p.user_id === currentUserId)
  const team1Voters = allPredictions.filter((p) => p.predicted_team === match.team1)
  const team2Voters = allPredictions.filter((p) => p.predicted_team === match.team2)
  const totalVotes = allPredictions.length
  const team1Pct = totalVotes > 0 ? Math.round((team1Voters.length / totalVotes) * 100) : 50
  const team2Pct = 100 - team1Pct

  const isWinner = (team: string) => match.winner === team
  const myResult = myPrediction?.is_correct
  const abandonedMatch = isWinner(match.team1) === false && isWinner(match.team2) === false

  return (
    <div
      className="glass rounded-2xl overflow-hidden"
      style={{
        border: myResult === true
          ? '1px solid rgba(34, 197, 94, 0.2)'
          : myResult === false
            ? '1px solid rgba(239, 68, 68, 0.15)'
            : '1px solid rgba(255,255,255,0.05)',
      }}
    >

      {abandonedMatch && (
        <div
          className="px-4 py-2 text-xs font-body font-medium flex items-center gap-2"
          style={{
            background: 'rgba(121, 84, 25, 0.34)',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
          }}
        >
          <span>⚠️</span><span className="incorrect">Match Abandoned</span>
        </div>
      )}

      {!myPrediction && !abandonedMatch && (
        <div
          className="px-4 py-2 text-xs font-body font-medium flex items-center gap-2"
          style={{
            background: myResult === true
              ? 'rgba(34, 197, 94, 0.1)'
              : 'rgba(239, 68, 68, 0.08)',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
          }}
        >
          <span className="incorrect">Match Abandoned</span>
        </div>
      )}


      {/* My result banner */}
      {myPrediction && !abandonedMatch && (
        <div
          className="px-4 py-2 text-xs font-body font-medium flex items-center gap-2"
          style={{
            background: myResult === true
              ? 'rgba(34, 197, 94, 0.1)'
              : 'rgba(239, 68, 68, 0.08)',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
          }}
        >
          {myResult === true ? (
            <><span>✅</span><span className="correct">You got it right</span></>
          ) : (
            <><span>❌</span><span className="incorrect">You picked {myPrediction.predicted_team}</span></>
          )}
        </div>
      )}

      {!myPrediction && !abandonedMatch && (
        <div
          className="px-4 py-2 text-xs text-brand-muted/50 font-body"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
        >
          No prediction placed
        </div>
      )}

      {/* Header */}
      <div className="px-4 pt-3 pb-1 flex items-start justify-between">
        <div>
          <div className="text-xs text-brand-muted">{formatMatchDate(match.match_date)}</div>
          {match.venue && (
            <div className="text-xs text-brand-muted/40 mt-0.5 truncate max-w-[180px]">📍 {match.venue}</div>
          )}
        </div>
        <div
          className="text-xs px-2.5 py-1 rounded-full font-body font-medium flex-shrink-0"
          style={{ background: '#1E1E2E', color: '#6B6B8A' }}
        >
          Completed
        </div>
      </div>

      {/* Teams */}
      <div className="px-4 py-4 flex items-center justify-between gap-4">
        <div className="flex flex-col items-center gap-2">
          <TeamBadge
            team={match.team1}
            size="lg"
            selected={isWinner(match.team1)}
            showName
          />
          {isWinner(match.team1) && (
            <span className="text-xs font-body font-medium" style={{ color: '#FFD700' }}>
              🏆 Winner
            </span>
          )}
        </div>

        <div className="flex flex-col items-center gap-1 flex-1">
          <span className="font-display font-bold text-lg text-brand-muted" style={{ letterSpacing: '0.05em' }}>
            VS
          </span>
          {match.winner && (
            <div className="text-[10px] text-brand-muted/50 text-center">
              {match.status}
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-2">
          <TeamBadge
            team={match.team2}
            size="lg"
            selected={isWinner(match.team2)}
            showName
          />
          {isWinner(match.team2) && (
            <span className="text-xs font-body font-medium" style={{ color: '#FFD700' }}>
              🏆 Winner
            </span>
          )}
        </div>
      </div>

      {/* Vote breakdown */}
      {totalVotes > 0 && !abandonedMatch && (
        <>
          <div className="px-4 pb-2">
            <div className="h-1.5 rounded-full overflow-hidden flex" style={{ background: '#1E1E2E' }}>
              <div
                className="h-full rounded-l-full transition-all"
                style={{
                  width: `${team1Pct}%`,
                  background: isWinner(match.team1) ? 'linear-gradient(90deg, #22C55E, #4ADE80)' : '#EF444444',
                }}
              />
              <div
                className="h-full rounded-r-full transition-all"
                style={{
                  width: `${team2Pct}%`,
                  background: isWinner(match.team2) ? 'linear-gradient(90deg, #4ADE80, #22C55E)' : '#EF444444',
                }}
              />
            </div>
          </div>

          {/* Individual votes with outcome */}
          {!abandonedMatch && (

            <div
              className="px-4 py-3 space-y-2"
              style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
            >
              <div className="text-[10px] text-brand-muted/50 uppercase tracking-wider mb-2">Who picked what</div>
              <div className="grid grid-cols-2 gap-3">
                <VoterList voters={team1Voters} teamName={match.team1} isWinnerTeam={isWinner(match.team1)} />
                <VoterList voters={team2Voters} teamName={match.team2} isWinnerTeam={isWinner(match.team2)} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function VoterList({
  voters,
  teamName,
  isWinnerTeam,
}: {
  voters: Prediction[]
  teamName: string
  isWinnerTeam: boolean
}) {
  return (
    <div>
      <div className="text-[10px] text-brand-muted mb-1.5">
        {teamName.split(' ').pop()} ({voters.length})
      </div>
      <div className="space-y-1.5">
        {voters.map((v) => (
          <div key={v.user_id} className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0">
              {v.profiles.avatar_url ? (
                <Image
                  src={v.profiles.avatar_url}
                  alt={v.profiles.name}
                  width={20}
                  height={20}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-[8px] font-bold text-white"
                  style={{ background: '#3A3A5A' }}
                >
                  {getInitials(v.profiles.name)}
                </div>
              )}
            </div>
            <span className="text-xs text-brand-muted/80 truncate flex-1">
              {v.profiles.name.split(' ')[0]}
            </span>
            <span className="text-[10px]">{isWinnerTeam ? '✅' : '❌'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
