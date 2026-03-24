'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleGoogleLogin() {
    setLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Background gradient blobs */}
      <div
        className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-20 blur-[120px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #FF6B2B, transparent)' }}
      />
      <div
        className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full opacity-15 blur-[100px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #FFD700, transparent)' }}
      />

      {/* Logo + hero */}
      <div className="text-center animate-in" style={{ animationDelay: '0ms' }}>
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
            style={{ background: 'linear-gradient(135deg, #FF6B2B, #FFD700)' }}>
            🏏
          </div>
        </div>

        <h1 className="font-display text-4xl md:text-5xl font-bold text-white leading-tight mb-3">
          IPL Predictor
        </h1>
        <p className="font-body text-brand-muted text-lg mb-2">
          Predict. Compete. Dominate.
        </p>
        <p className="font-body text-sm text-brand-muted/70">
          Pick the winner before every IPL match.<br />
          May the best cricket brain win.
        </p>
      </div>

      {/* Stats row */}
      <div className="flex gap-8 mt-10 mb-12 animate-in" style={{ animationDelay: '80ms' }}>
        {[
          { label: 'Per correct pick', value: '+1 pt' },
          { label: 'Voting locked', value: '30 min' },
          { label: 'Live leaderboard', value: '🔥' },
        ].map((s) => (
          <div key={s.label} className="text-center">
            <div className="font-display text-xl font-bold text-white">{s.value}</div>
            <div className="text-xs text-brand-muted mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Login card */}
      <div
        className="glass rounded-3xl p-8 w-full max-w-sm animate-in"
        style={{ animationDelay: '160ms' }}
      >
        <p className="text-center text-sm text-brand-muted mb-6">
          Sign in with your Google account to join your crew
        </p>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-2xl font-body font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: loading
              ? '#1E1E2E'
              : 'linear-gradient(135deg, #ffffff, #f0f0f0)',
            color: '#1A1A1A',
            boxShadow: loading ? 'none' : '0 4px 24px rgba(255,255,255,0.12)',
          }}
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <GoogleIcon />
          )}
          {loading ? 'Redirecting…' : 'Continue with Google'}
        </button>

        <p className="text-center text-xs text-brand-muted/60 mt-5">
          This is a closed group — you&apos;ll need an invite code after signing in.
        </p>
      </div>

      {/* Footer */}
      <p className="mt-10 text-xs text-brand-muted/40 animate-in" style={{ animationDelay: '240ms' }}>
        IPL 2025 · Made for the group chat 🏏
      </p>
    </main>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853" />
      <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.826.957 4.039l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  )
}
