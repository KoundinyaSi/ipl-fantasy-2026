import { createClient } from '@/lib/supabase/server'
import { isVotingLocked } from '@/lib/utils'
import { NextResponse } from 'next/server'

// GET /api/predictions?match_id=xxx
// Returns all predictions for a match (for the vote breakdown UI)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const matchId = searchParams.get('match_id')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const query = supabase
    .from('predictions')
    .select(`
      id,
      match_id,
      predicted_team,
      is_correct,
      created_at,
      profiles (
        id,
        name,
        avatar_url
      )
    `)

  if (matchId) {
    query.eq('match_id', matchId)
  } else {
    // Return current user's predictions for all matches
    query.eq('user_id', user.id)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ predictions: data })
}

// POST /api/predictions
// Body: { match_id, predicted_team }
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { match_id, predicted_team } = body

  if (!match_id || !predicted_team) {
    return NextResponse.json({ error: 'match_id and predicted_team are required' }, { status: 400 })
  }

  // Fetch the match to check lock status and valid teams
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select('id, team1, team2, match_date, match_ended')
    .eq('id', match_id)
    .single()

  if (matchError || !match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  }

  if (match.match_ended) {
    return NextResponse.json({ error: 'Match has ended, voting is closed' }, { status: 400 })
  }

  if (isVotingLocked(match.match_date)) {
    return NextResponse.json({ error: 'Voting is locked — less than 30 minutes to match start' }, { status: 400 })
  }

  const validTeams = [match.team1, match.team2]
  if (!validTeams.includes(predicted_team)) {
    return NextResponse.json({ error: 'Invalid team selection' }, { status: 400 })
  }

  // Check profile is approved
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_approved')
    .eq('id', user.id)
    .single()

  if (!profile?.is_approved) {
    return NextResponse.json({ error: 'Account not approved' }, { status: 403 })
  }

  // Upsert prediction (allows changing vote until lock time)
  const { data: prediction, error: predError } = await supabase
    .from('predictions')
    .upsert(
      {
        user_id: user.id,
        match_id,
        predicted_team,
        is_correct: null, // will be set when match ends
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,match_id' }
    )
    .select()
    .single()

  if (predError) {
    return NextResponse.json({ error: predError.message }, { status: 500 })
  }

  return NextResponse.json({ prediction })
}
