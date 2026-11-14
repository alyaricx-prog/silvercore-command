'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { Profile } from '@/lib/types'

type Period = 'today' | 'week' | 'month'

type Row = { profile: Profile; count: number }

const RANK_EMOJI = ['🥇', '🥈', '🥉']

function periodStart(period: Period): string {
  const now = new Date()
  if (period === 'today') {
    now.setHours(0, 0, 0, 0)
  } else if (period === 'week') {
    now.setDate(now.getDate() - now.getDay())
    now.setHours(0, 0, 0, 0)
  } else {
    now.setDate(1)
    now.setHours(0, 0, 0, 0)
  }
  return now.toISOString()
}

export default function Leaderboard({ organisationId, team, currentProfileId }: {
  organisationId: string
  team: Profile[]
  currentProfileId: string
}) {
  const [period, setPeriod] = useState<Period>('today')
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const since = periodStart(period)
      const { data } = await supabase
        .from('deal_logs')
        .select('logged_by')
        .eq('organisation_id', organisationId)
        .eq('outcome', 'closed')
        .gte('created_at', since)
      if (cancelled) return
      const counts = new Map<string, number>()
      for (const row of data || []) {
        counts.set(row.logged_by, (counts.get(row.logged_by) ?? 0) + 1)
      }
      const ranked = team
        .map(p => ({ profile: p, count: counts.get(p.id) ?? 0 }))
        .sort((a, b) => b.count - a.count)
      setRows(ranked)
      setLoading(false)
    }
    if (team.length > 0) load()
    return () => { cancelled = true }
  }, [period, organisationId, team])

  const myRank = rows.findIndex(r => r.profile.id === currentProfileId)

  return (
    <div className="bg-card border border-rim rounded-xl p-4">
      <div className="flex items-center justify-between mb-3 gap-2">
        <h2 className="text-xs text-dim uppercase tracking-widest">🏆 Leaderboard</h2>
        <div className="flex gap-1 shrink-0">
          {(['today', 'week', 'month'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize transition ${
                period === p ? 'bg-blue-600 text-white' : 'bg-well text-dim'
              }`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-dim text-sm text-center py-6">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-dim text-sm text-center py-6">No team members yet.</p>
      ) : (
        <div className="space-y-1.5">
          {rows.map((r, i) => {
            const isMe = r.profile.id === currentProfileId
            return (
              <div key={r.profile.id}
                className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                  isMe ? 'bg-blue-900/20 border border-blue-500/40' : ''
                }`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-6 text-center text-sm shrink-0">
                    {RANK_EMOJI[i] ?? `#${i + 1}`}
                  </span>
                  <p className={`text-sm truncate ${isMe ? 'font-semibold text-hi' : 'text-lo'}`}>
                    {r.profile.full_name}{isMe ? ' (you)' : ''}
                  </p>
                </div>
                <span className="text-sm font-semibold text-hi shrink-0">{r.count}</span>
              </div>
            )
          })}
        </div>
      )}

      {myRank > 0 && rows[myRank - 1] && (
        <p className="text-xs text-dim text-center mt-3">
          {rows[myRank - 1].count - rows[myRank].count} more to pass {rows[myRank - 1].profile.full_name.split(' ')[0]}
        </p>
      )}
      {myRank === 0 && rows.length > 1 && rows[0].count > 0 && (
        <p className="text-xs text-center mt-3" style={{ color: '#4ade80' }}>
          You're in the lead 🔥
        </p>
      )}
    </div>
  )
}
