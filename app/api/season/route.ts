import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const LOCK_AT = process.env.SEASON_PICK_LOCK_AT
  ? new Date(process.env.SEASON_PICK_LOCK_AT)
  : null

function isLocked(): boolean {
  if (!LOCK_AT) return false
  return new Date() >= LOCK_AT
}

// GET /api/season
// Returns season config, current user's pick, and all picks (if locked)
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const locked = isLocked()

  // Always fetch user's own pick
  const { data: myPick } = await supabase
    .from('season_predictions')
    .select('*')
    .eq('user_id', user.id)
    .single()

  // Fetch all picks only after lock
  let allPicks = null
  if (locked) {
    const { data } = await supabase
      .from('season_predictions')
      .select('*, profiles(id, name, avatar_url)')
    allPicks = data
  }

  return NextResponse.json({
    lock_at: LOCK_AT?.toISOString() ?? null,
    locked,
    my_pick: myPick ?? null,
    all_picks: allPicks ?? null,
  })
}

// POST /api/season
// Body: { first_place, second_place }
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (isLocked()) {
    return NextResponse.json({ error: 'Season picks are locked' }, { status: 400 })
  }

  const { first_place, second_place } = await request.json()

  if (!first_place || !second_place) {
    return NextResponse.json({ error: 'first_place and second_place required' }, { status: 400 })
  }

  if (first_place === second_place) {
    return NextResponse.json({ error: 'First and second place must be different teams' }, { status: 400 })
  }

  const serviceSupabase = createServiceClient()
  const { data, error } = await serviceSupabase
    .from('season_predictions')
    .upsert(
      {
        user_id: user.id,
        first_place,
        second_place,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ pick: data })
}