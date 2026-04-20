'use client'

import { createClient } from '@/lib/supabase/client'
import { getInitials } from '@/lib/utils'
import Image from 'next/image'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Profile {
    id: string
    name: string
    email: string
    avatar_url: string | null
    voting_streak: number
    login_streak: number
}

interface Prediction {
    id: string
    match_id: string
    predicted_team: string
    is_correct: boolean | null
    points: number
    match_name: string
    match_date: string
    winner: string | null
}

type AdminView = 'users' | 'predictions'

const ADMIN_EMAILS = [
    process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? '',
    process.env.NEXT_PUBLIC_ADMIN_EMAIL_2 ?? '',
].filter(Boolean)

export default function AdminDashboard({ currentUserEmail }: { currentUserEmail: string }) {
    const [view, setView] = useState<AdminView>('users')
    const [profiles, setProfiles] = useState<Profile[]>([])
    const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
    const [predictions, setPredictions] = useState<Prediction[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState<string | null>(null)
    const [message, setMessage] = useState('')
    const supabase = createClient()

    const isAdmin = ADMIN_EMAILS.map(e => e.toLowerCase()).includes(currentUserEmail.toLowerCase())
    const router = useRouter()

    const loadProfiles = useCallback(async () => {
        const { data } = await supabase
            .from('profiles')
            .select('id, name, email, avatar_url, voting_streak, login_streak')
            .eq('is_approved', true)
            .order('name')
        setProfiles(data ?? [])
        setLoading(false)
    }, [supabase])

    const loadPredictions = useCallback(async (userId: string) => {
        const { data } = await supabase
            .from('predictions')
            .select(`
        id, match_id, predicted_team, is_correct, points,
        matches(name, match_date, winner)
      `)
            .eq('user_id', userId)
            .not('is_correct', 'is', null)
            .order('matches(match_date)', { ascending: false })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setPredictions((data ?? []).map((p: any) => ({
            id: p.id,
            match_id: p.match_id,
            predicted_team: p.predicted_team,
            is_correct: p.is_correct,
            points: p.points,
            match_name: p.matches?.name ?? '',
            match_date: p.matches?.match_date ?? '',
            winner: p.matches?.winner ?? null,
        })))
    }, [supabase])

    useEffect(() => { loadProfiles() }, [loadProfiles])

    useEffect(() => {
        if (selectedUser) loadPredictions(selectedUser.id)
    }, [selectedUser, loadPredictions])

    async function updateStreak(userId: string, newStreak: number) {
        setSaving(`streak-${userId}`)
        setMessage('')
        const { error } = await supabase
            .from('profiles')
            .update({ voting_streak: newStreak, updated_at: new Date().toISOString() })
            .eq('id', userId)
        if (error) setMessage(`❌ ${error.message}`)
        else {
            setMessage('✅ Streak updated')
            setProfiles(prev => prev.map(p => p.id === userId ? { ...p, voting_streak: newStreak } : p))
            if (selectedUser?.id === userId) setSelectedUser(prev => prev ? { ...prev, voting_streak: newStreak } : null)
        }
        setSaving(null)
    }

    async function updatePoints(predictionId: string, newPoints: number) {
        setSaving(`points-${predictionId}`)
        setMessage('')
        const { error } = await supabase
            .from('predictions')
            .update({ points: newPoints, updated_at: new Date().toISOString() })
            .eq('id', predictionId)
        if (error) setMessage(`❌ ${error.message}`)
        else {
            setMessage('✅ Points updated')
            setPredictions(prev => prev.map(p => p.id === predictionId ? { ...p, points: newPoints } : p))
        }
        setSaving(null)
    }

    async function recalcLeaderboard() {
        setSaving('leaderboard')
        setMessage('')
        // Leaderboard is a view — just reload profiles to reflect latest
        await loadProfiles()
        if (selectedUser) await loadPredictions(selectedUser.id)
        setMessage('✅ Leaderboard refreshed')
        setSaving(null)
    }

    if (!isAdmin) {
        return (
            <div className="flex items-center justify-center h-screen">
                <p className="text-brand-muted text-sm">Access denied.</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen px-4 py-6 max-w-lg mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push('/home')}
                        className="w-8 h-8 rounded-full flex items-center justify-center transition-all flex-shrink-0"
                        style={{ background: '#1E1E2E', border: '1px solid rgba(255,255,255,0.06)' }}
                        aria-label="Back to home"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C4C4D4" strokeWidth="2">
                            <path d="M19 12H5M12 5l-7 7 7 7" />
                        </svg>
                    </button>
                    <div>
                        <h1 className="font-display font-bold text-white text-xl">Admin Dashboard</h1>
                        <p className="text-xs text-brand-muted mt-0.5">Manual score & streak management</p>
                    </div>
                </div>
                <button
                    onClick={recalcLeaderboard}
                    disabled={saving === 'leaderboard'}
                    className="text-xs px-3 py-2 rounded-xl font-body font-medium disabled:opacity-40 transition-all"
                    style={{ background: '#FFD70022', color: '#FFD700', border: '1px solid #FFD70033' }}
                >
                    {saving === 'leaderboard' ? '…' : '🔄 Refresh LB'}
                </button>
            </div>

            {/* Message */}
            {message && (
                <div
                    className="mb-4 px-4 py-2.5 rounded-xl text-sm font-body"
                    style={{
                        background: message.startsWith('✅') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                        color: message.startsWith('✅') ? '#22C55E' : '#EF4444',
                        border: `1px solid ${message.startsWith('✅') ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                    }}
                >
                    {message}
                </div>
            )}

            {/* View tabs */}
            <div className="flex gap-2 mb-5">
                {(['users', 'predictions'] as AdminView[]).map(v => (
                    <button
                        key={v}
                        onClick={() => { setView(v); setMessage('') }}
                        className="flex-1 py-2.5 rounded-xl text-sm font-body font-medium capitalize transition-all"
                        style={{
                            background: view === v ? '#FF6B2B' : '#12121A',
                            color: view === v ? '#fff' : '#C4C4D4',
                            border: view === v ? 'none' : '1px solid rgba(255,255,255,0.05)',
                        }}
                    >
                        {v === 'users' ? '👥 Users & Streaks' : '🎯 Predictions'}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: '#FF6B2B33', borderTopColor: '#FF6B2B' }} />
                </div>
            ) : view === 'users' ? (
                // ─── USERS & STREAKS ────────────────────────────────────────────────
                <div className="space-y-2">
                    {profiles.map(p => (
                        <UserRow
                            key={p.id}
                            profile={p}
                            saving={saving}
                            onUpdateStreak={updateStreak}
                        />
                    ))}
                </div>
            ) : (
                // ─── PREDICTIONS ────────────────────────────────────────────────────
                <div>
                    {/* User picker */}
                    <div className="mb-4">
                        <label className="text-xs text-brand-muted mb-2 block">Select user to edit predictions</label>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {profiles.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => setSelectedUser(p)}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
                                    style={{
                                        background: selectedUser?.id === p.id ? 'rgba(255,107,43,0.1)' : '#12121A',
                                        border: selectedUser?.id === p.id ? '1px solid rgba(255,107,43,0.3)' : '1px solid rgba(255,255,255,0.05)',
                                    }}
                                >
                                    <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                                        {p.avatar_url ? (
                                            <Image src={p.avatar_url} alt={p.name} width={28} height={28} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-white"
                                                style={{ background: 'linear-gradient(135deg,#2A2A3A,#3A3A5A)' }}>
                                                {getInitials(p.name)}
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-sm font-body text-white truncate">{p.name}</span>
                                    <span className="text-xs text-brand-muted ml-auto flex-shrink-0">🔥 {p.voting_streak}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Predictions list */}
                    {selectedUser && (
                        <div>
                            <div className="text-xs text-brand-muted uppercase tracking-wider mb-3">
                                {selectedUser.name}'s predictions
                            </div>
                            <div className="space-y-2">
                                {predictions.length === 0 ? (
                                    <p className="text-brand-muted text-sm text-center py-8">No resolved predictions yet</p>
                                ) : (
                                    predictions.map(pred => (
                                        <PredictionRow
                                            key={pred.id}
                                            prediction={pred}
                                            saving={saving}
                                            onUpdatePoints={updatePoints}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

function UserRow({
    profile,
    saving,
    onUpdateStreak,
}: {
    profile: Profile
    saving: string | null
    onUpdateStreak: (id: string, streak: number) => void
}) {
    const [editStreak, setEditStreak] = useState(String(profile.voting_streak))
    const [editing, setEditing] = useState(false)
    const isSaving = saving === `streak-${profile.id}`

    function handleSave() {
        const val = parseInt(editStreak)
        if (isNaN(val) || val < 0) return
        onUpdateStreak(profile.id, val)
        setEditing(false)
    }

    return (
        <div
            className="glass rounded-2xl px-4 py-3 flex items-center gap-3"
            style={{ border: '1px solid rgba(255,255,255,0.05)' }}
        >
            <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
                {profile.avatar_url ? (
                    <Image src={profile.avatar_url} alt={profile.name} width={36} height={36} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ background: 'linear-gradient(135deg,#2A2A3A,#3A3A5A)' }}>
                        {getInitials(profile.name)}
                    </div>
                )}
            </div>

            <div className="flex-1 min-w-0">
                <div className="font-body font-semibold text-sm text-white truncate">{profile.name}</div>
                <div className="text-[10px] text-brand-muted truncate">{profile.email}</div>
            </div>

            {/* Match streak editor */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-[10px] text-brand-muted">streak</span>
                {editing ? (
                    <>
                        <input
                            type="number"
                            min="0"
                            value={editStreak}
                            onChange={e => setEditStreak(e.target.value)}
                            className="w-12 text-center text-sm font-display font-bold text-white rounded-lg px-1 py-1 outline-none"
                            style={{ background: '#1E1E2E', border: '1px solid #FF6B2B' }}
                            autoFocus
                            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
                        />
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="text-[11px] px-2 py-1 rounded-lg font-body font-semibold disabled:opacity-40"
                            style={{ background: '#22C55E22', color: '#22C55E' }}
                        >
                            {isSaving ? '…' : 'Save'}
                        </button>
                        <button
                            onClick={() => { setEditing(false); setEditStreak(String(profile.voting_streak)) }}
                            className="text-[11px] px-2 py-1 rounded-lg font-body"
                            style={{ background: '#1E1E2E', color: '#C4C4D4' }}
                        >
                            ✕
                        </button>
                    </>
                ) : (
                    <button
                        onClick={() => setEditing(true)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all"
                        style={{ background: '#1E1E2E', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                        <span className="font-display font-bold text-sm" style={{ color: profile.voting_streak > 0 ? '#FF6B2B' : '#C4C4D4' }}>
                            {profile.voting_streak}
                        </span>
                        <span className="text-[10px] text-brand-muted">✏️</span>
                    </button>
                )}
            </div>
        </div>
    )
}

function PredictionRow({
    prediction,
    saving,
    onUpdatePoints,
}: {
    prediction: Prediction
    saving: string | null
    onUpdatePoints: (id: string, points: number) => void
}) {
    const [editPoints, setEditPoints] = useState(String(prediction.points))
    const [editing, setEditing] = useState(false)
    const isSaving = saving === `points-${prediction.id}`

    const matchShortName = prediction.match_name
        .split(',')[0]
        .replace('Indian Premier League 2026', '')
        .trim()

    function handleSave() {
        const val = parseInt(editPoints)
        if (isNaN(val) || val < 0) return
        onUpdatePoints(prediction.id, val)
        setEditing(false)
    }

    return (
        <div
            className="rounded-2xl px-3 py-2.5 transition-all"
            style={{
                background: prediction.is_correct ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.05)',
                border: `1px solid ${prediction.is_correct ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.1)'}`,
            }}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <div className="text-xs font-body font-medium text-white truncate">{matchShortName}</div>
                    <div className="text-[10px] text-brand-muted mt-0.5">
                        Picked: {prediction.predicted_team.split(' ').pop()} ·
                        Winner: {prediction.winner?.split(' ').pop() ?? '?'} ·
                        {prediction.is_correct ? <span className="correct"> ✅</span> : <span className="incorrect"> ❌</span>}
                    </div>
                </div>

                {/* Points editor */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-[10px] text-brand-muted">pts</span>
                    {editing ? (
                        <>
                            <input
                                type="number"
                                min="0"
                                max="2"
                                value={editPoints}
                                onChange={e => setEditPoints(e.target.value)}
                                className="w-10 text-center text-sm font-display font-bold text-white rounded-lg px-1 py-1 outline-none"
                                style={{ background: '#1E1E2E', border: '1px solid #FF6B2B' }}
                                autoFocus
                                onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
                            />
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="text-[11px] px-2 py-1 rounded-lg font-body font-semibold disabled:opacity-40"
                                style={{ background: '#22C55E22', color: '#22C55E' }}
                            >
                                {isSaving ? '…' : 'Save'}
                            </button>
                            <button
                                onClick={() => { setEditing(false); setEditPoints(String(prediction.points)) }}
                                className="text-[11px] px-2 py-1 rounded-lg font-body"
                                style={{ background: '#1E1E2E', color: '#C4C4D4' }}
                            >
                                ✕
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => setEditing(true)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg"
                            style={{ background: '#1E1E2E', border: '1px solid rgba(255,255,255,0.06)' }}
                        >
                            <span className="font-display font-bold text-sm text-white">{prediction.points}</span>
                            <span className="text-[10px] text-brand-muted">✏️</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}