'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function InvitePage() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    console.log('Submitting invite code ----------------->', code)
    const res = await fetch('/api/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code.trim() }),
    })
    console.log('Received response from invite API:', res)
    const data = res
    console.log('Invite API response-------------->', res.status, data)
    // console.log('Invite code verification response:', data)
    if (res.ok) {
      console.log('Invite code accepted, redirecting to home page')
      // router.refresh()       // invalidates the cache
      // router.push('/home')
      window.location.href = '/home' // Full reload to ensure all auth state is fresh
    } else {
      // console.error('Invite code verification failed:', data.error)
      // setError(data.error || 'Invalid code. Try again.')
      setLoading(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Background blob */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10 blur-[140px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #FF6B2B, #FFD700, transparent)' }}
      />

      <div className="w-full max-w-sm animate-in">
        {/* Icon */}
        <div className="flex justify-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
            style={{ background: 'linear-gradient(135deg, #FF6B2B22, #FFD70022)', border: '1px solid #FF6B2B44' }}
          >
            🔐
          </div>
        </div>

        <h1 className="font-display text-3xl font-bold text-white text-center mb-2">
          Enter Invite Code
        </h1>
        <p className="text-brand-muted text-sm text-center mb-8">
          This is a closed group. Ask your crew for the code to join.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter invite code…"
              className="w-full px-5 py-4 rounded-2xl font-body text-white placeholder-brand-muted/50 outline-none transition-all"
              style={{
                background: '#12121A',
                border: error ? '1px solid #EF4444' : '1px solid #1E1E2E',
                fontSize: '16px', // Prevent iOS zoom
              }}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
            />
            {error && (
              <p className="text-red-400 text-sm mt-2 pl-1">{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={!code.trim() || loading}
            className="w-full py-4 rounded-2xl font-body font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg, #FF6B2B, #FF8C5A)',
              color: '#fff',
              boxShadow: '0 4px 24px rgba(255, 107, 43, 0.35)',
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Verifying…
              </span>
            ) : (
              'Join the League →'
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button
            onClick={handleLogout}
            className="text-sm text-brand-muted/60 hover:text-brand-muted transition-colors"
          >
            Sign out and use a different account
          </button>
        </div>
      </div>
    </main>
  )
}
