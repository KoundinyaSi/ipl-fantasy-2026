'use client'

import { createPortal } from 'react-dom'
import { useState, useEffect } from 'react'
import Image from 'next/image'

interface Player {
    id: string
    name: string
    role: string
    player_img: string
}

interface MatchPlayer {
    player_id: string
    team: string
    is_playing_11: boolean
    players: Player
}

interface Match {
    id: string
    team1: string
    team2: string
    match_date: string
}

interface Playing11AdminModalProps {
    matches: Match[]
    onClose: () => void
}

export default function Playing11AdminModal({ matches, onClose }: Playing11AdminModalProps) {
    const [selectedMatchId, setSelectedMatchId] = useState(matches[0]?.id ?? '')
    const [matchPlayers, setMatchPlayers] = useState<MatchPlayer[]>([])
    const [playing11, setPlaying11] = useState<Set<string>>(new Set())
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState('')

    useEffect(() => {
        document.body.style.overflow = 'hidden'
        return () => { document.body.style.overflow = '' }
    }, [])

    useEffect(() => {
        if (!selectedMatchId) return
        setLoading(true)
        fetch(`/api/fantasy/admin/playing11?match_id=${selectedMatchId}`)
            .then(r => r.json())
            .then(d => {
                const players: MatchPlayer[] = d.players ?? []
                setMatchPlayers(players)
                setPlaying11(new Set(players.filter(p => p.is_playing_11).map(p => p.player_id)))
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [selectedMatchId])

    function togglePlayer(pid: string) {
        const next = new Set(playing11)
        if (next.has(pid)) next.delete(pid)
        else next.add(pid)
        setPlaying11(next)
    }

    async function handleConfirm() {
        setSaving(true)
        setMessage('')
        const res = await fetch('/api/fantasy/admin/playing11', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ match_id: selectedMatchId, player_ids: Array.from(playing11) }),
        })
        const data = await res.json()
        setSaving(false)
        if (res.ok) setMessage(`✅ Playing 11 confirmed at ${new Date().toLocaleTimeString()}. Sub window open for 1 hour.`)
        else setMessage(`❌ ${data.error}`)
    }

    const teams = Array.from(new Set(matchPlayers.map(mp => mp.team)))

    return createPortal(
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#0A0A0F' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <button onClick={onClose} className="text-brand-muted p-1">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5M12 5l-7 7 7 7" />
                    </svg>
                </button>
                <div className="text-center">
                    <h2 className="font-display font-bold text-white text-sm">Set Playing 11</h2>
                    <p className="text-[10px]" style={{ color: '#FFD700' }}>{playing11.size} selected</p>
                </div>
                <button
                    onClick={handleConfirm}
                    disabled={saving || playing11.size === 0}
                    className="text-xs font-body font-semibold px-3 py-1.5 rounded-xl disabled:opacity-30"
                    style={{ background: 'linear-gradient(135deg, #FFD700, #FF6B2B)', color: '#000' }}
                >
                    {saving ? '…' : 'Confirm'}
                </button>
            </div>

            {/* Match selector */}
            <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <select
                    value={selectedMatchId}
                    onChange={e => setSelectedMatchId(e.target.value)}
                    className="w-full bg-brand-card text-white text-sm rounded-xl px-3 py-2 border border-brand-border outline-none"
                >
                    {matches.map(m => (
                        <option key={m.id} value={m.id}>
                            {m.team1.split(' ').map((w: string) => w[0]).join('')} vs {m.team2.split(' ').map((w: string) => w[0]).join('')} — {new Date(m.match_date).toLocaleDateString()}
                        </option>
                    ))}
                </select>
            </div>

            {message && (
                <div className="px-4 py-2 text-xs flex-shrink-0" style={{ color: message.startsWith('✅') ? '#22C55E' : '#EF4444' }}>
                    {message}
                </div>
            )}

            {/* Player list grouped by team */}
            <div className="flex-1 overflow-y-auto px-4 pb-8">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: '#FFD70033', borderTopColor: '#FFD700' }} />
                    </div>
                ) : (
                    teams.map(team => (
                        <div key={team} className="mt-4">
                            <div className="text-xs font-body font-semibold text-brand-muted uppercase tracking-wider mb-2">{team}</div>
                            <div className="space-y-2">
                                {matchPlayers.filter(mp => mp.team === team).map(mp => {
                                    const isIn = playing11.has(mp.player_id)
                                    return (
                                        <button
                                            key={mp.player_id}
                                            onClick={() => togglePlayer(mp.player_id)}
                                            className="w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all"
                                            style={{
                                                background: isIn ? 'rgba(255,215,0,0.08)' : '#12121A',
                                                border: isIn ? '1px solid rgba(255,215,0,0.3)' : '1px solid rgba(255,255,255,0.05)',
                                            }}
                                        >
                                            <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0" style={{ background: '#1E1E2E' }}>
                                                {mp.players.player_img && !mp.players.player_img.includes('icon512') ? (
                                                    <Image src={mp.players.player_img} alt={mp.players.name} width={32} height={32} className="w-full h-full object-cover" unoptimized />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-sm">🏏</div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-body font-semibold text-sm text-white truncate">{mp.players.name}</div>
                                                <div className="text-[10px] text-brand-muted">{mp.players.role}</div>
                                            </div>
                                            <div
                                                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                                                style={{ background: isIn ? '#FFD700' : '#1E1E2E', color: isIn ? '#000' : '#C4C4D4' }}
                                            >
                                                {isIn ? '✓' : ''}
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>,
        document.body
    )
}