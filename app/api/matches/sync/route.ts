import { createServiceClient } from '@/lib/supabase/server'
import { fetchIPLMatches } from '@/lib/cricapi'
import { NextResponse } from 'next/server'

// Vercel cron calls this every 3 hours (see vercel.json)
// Also callable manually as an admin

export async function GET(request: Request) {
  // Basic protection for the cron endpoint
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  // Allow Vercel cron (no auth header) OR explicit secret
  const isVercelCron = request.headers.get('x-vercel-cron') === '1'
  const hasSecret = cronSecret && authHeader === `Bearer ${cronSecret}`

  if (!isVercelCron && !hasSecret && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServiceClient()

  try {
    const matches = await fetchIPLMatches()

    if (!matches.length) {
      return NextResponse.json({ message: 'No IPL matches found from API', synced: 0 })
    }

    let synced = 0
    let resultsProcessed = 0

    for (const match of matches) {
      // Upsert match into DB
      const { error: matchError } = await supabase.from('matches').upsert(
        {
          id: match.id,
          name: match.name,
          team1: match.team1,
          team2: match.team2,
          venue: match.venue,
          match_date: match.match_date,
          status: match.status,
          winner: match.winner,
          match_started: match.match_started,
          match_ended: match.match_ended,
          raw_data: match.raw_data,
          last_synced: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )

      if (matchError) {
        console.error(`Error upserting match ${match.id}:`, matchError)
        continue
      }

      synced++

      // If match just ended and has a winner, resolve predictions
      if (match.match_ended && match.winner) {
        await resolveMatchPredictions(supabase, match.id, match.winner, match.match_date)
        resultsProcessed++
      }
    }

    return NextResponse.json({
      message: 'Sync complete',
      synced,
      resultsProcessed,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Sync error:', err)
    return NextResponse.json({ error: 'Sync failed', details: String(err) }, { status: 500 })
  }
}

async function resolveMatchPredictions(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  matchId: string,
  winner: string,
  matchDate: string
) {
  // Get all predictions for this match that haven't been resolved yet
  const { data: predictions, error } = await supabase
    .from('predictions')
    .select('id, user_id, predicted_team')
    .eq('match_id', matchId)
    .is('is_correct', null) // only unresolved

  if (error || !predictions?.length) return

  const matchDay = matchDate.slice(0, 10) // YYYY-MM-DD

  for (const prediction of predictions) {
    const isCorrect = prediction.predicted_team === winner

    // Mark prediction correct/incorrect
    await supabase
      .from('predictions')
      .update({ is_correct: isCorrect, updated_at: new Date().toISOString() })
      .eq('id', prediction.id)

    // If correct, update voting streak
    if (isCorrect) {
      await supabase.rpc('update_voting_streak', {
        p_user_id: prediction.user_id,
        match_day: matchDay,
      })
    } else {
      // Voting streak broken — reset if they got one wrong today
      // (streak is consecutive CORRECT days, one wrong prediction breaks it)
      const { data: profile } = await supabase
        .from('profiles')
        .select('last_correct_vote_date, voting_streak')
        .eq('id', prediction.user_id)
        .single()

      // Only reset streak if they haven't already had a correct vote today
      if (profile && profile.last_correct_vote_date !== matchDay) {
        await supabase
          .from('profiles')
          .update({ voting_streak: 0, updated_at: new Date().toISOString() })
          .eq('id', prediction.user_id)
      }
    }
  }
}
