'use client'

import { cn } from '@/lib/utils'

type Tab = 'matches' | 'results' | 'leaderboard'

interface FloatingNavProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'matches', label: 'Upcoming', icon: '🗓️' },
  { id: 'results', label: 'Results', icon: '📊' },
  { id: 'leaderboard', label: 'Leaderboard', icon: '🏆' },
]

export default function FloatingNav({ activeTab, onTabChange }: FloatingNavProps) {
  return (
    <div className="floating-nav">
      <div
        className="glass-strong flex items-center p-1.5 gap-1 rounded-full"
        style={{
          boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)',
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-body font-medium transition-all duration-200',
                isActive
                  ? 'text-white'
                  : 'text-brand-muted hover:text-white/70'
              )}
              style={
                isActive
                  ? {
                      background: 'linear-gradient(135deg, #FF6B2B, #FF8C5A)',
                      boxShadow: '0 2px 12px rgba(255, 107, 43, 0.45)',
                    }
                  : {}
              }
            >
              <span className="text-base leading-none">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
