import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST /api/season/resolve
// Admin only — enter actual results and award points to all users
// Body: { actual_first, actual_second }
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Admin check
  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', user.id)
    .single()

  const adminEmails = [
    process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? '',
    process.env.NEXT_PUBLIC_ADMIN_EMAIL_2 ?? '',
  ].map(e => e.toLowerCase()).filter(Boolean)

  if (!profile?.email || !adminEmails.includes(profile.email.toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { actual_first, actual_second } = await request.json()
  if (!actual_first || !actual_second) {
    return NextResponse.json({ error: 'actual_first and actual_second required' }, { status: 400 })
  }

  const serviceSupabase = createServiceClient()

  // Check not already processed
  const { data: config } = await serviceSupabase
    .from('season_config')
    .select('results_processed')
    .eq('id', 1)
    .single()

  if (config?.results_processed) {
    return NextResponse.json({ error: 'Results already processed' }, { status: 400 })
  }

  // Fetch all season predictions
  const { data: picks, error: picksError } = await serviceSupabase
    .from('season_predictions')
    .select('id, user_id, first_place, second_place')

  if (picksError) return NextResponse.json({ error: picksError.message }, { status: 500 })

  let awarded = 0

  for (const pick of picks ?? []) {
    const firstCorrect = pick.first_place === actual_first
    const secondCorrect = pick.second_place === actual_second

    // +10 for both, +5 for first only, 0 for second only or neither
    let points = 0
    if (firstCorrect && secondCorrect) points = 10
    else if (firstCorrect) points = 5

    if (points > 0) {
      await serviceSupabase
        .from('season_predictions')
        .update({ points_awarded: points, updated_at: new Date().toISOString() })
        .eq('id', pick.id)
      awarded++
    } else {
      await serviceSupabase
        .from('season_predictions')
        .update({ points_awarded: 0, updated_at: new Date().toISOString() })
        .eq('id', pick.id)
    }
  }

  // Save results to config and mark processed
  await serviceSupabase
    .from('season_config')
    .update({
      actual_first,
      actual_second,
      results_processed: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1)

  return NextResponse.json({
    success: true,
    total_picks: picks?.length ?? 0,
    points_awarded_to: awarded,
  })
}

// GET /api/season/resolve — returns current season config for admin
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('season_config')
    .select('*')
    .eq('id', 1)
    .single()

  return NextResponse.json({ config: data })
}