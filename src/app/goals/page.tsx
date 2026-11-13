'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import PageSkeleton from '@/components/Skeleton'
import type { Profile, Goal, Badge } from '@/lib/types'

const BADGE_EMOJI: Record<string, string> = {
  first_deal: '🎯',
  streak_3:   '🔥',
  streak_7:   '⚡',
  top_closer: '🏆',
  mvp:        '⭐',
  milestone:  '🏅',
}

function GoalCard({ goal, profileName }: { goal: Goal; profileName?: string }) {
  const pct = goal.target > 0 ? Math.min(100, Math.round((goal.current_value / goal.target) * 100)) : 0
  const color = pct >= 100 ? '#4ade80' : pct >= 60 ? '#60a5fa' : pct >= 30 ? '#facc15' : '#f87171'
  return (
    <div className="bg-card border border-rim rounded-xl p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="text-sm font-semibold text-hi">{goal.title}</p>
          {profileName && <p className="text-xs text-dim">{profileName}</p>}
        </div>
        <span className="text-xs text-dim capitalize shrink-0">{goal.period}</span>
      </div>
      <div className="flex justify-between text-xs text-dim mb-1">
        <span className="capitalize">{goal.metric.replace(/_/g, ' ')}</span>
        <span style={{ color }}>{goal.current_value} / {goal.target}</span>
      </div>
      <div className="h-2 bg-well rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
      <p className="text-right text-xs mt-1" style={{ color }}>{pct}%</p>
    </div>
  )
}

export default function GoalsPage() {
  const [profile, setProfile]     = useState<Profile | null>(null)
  const [team, setTeam]           = useState<Profile[]>([])
  const [goals, setGoals]         = useState<Goal[]>([])
  const [badges, setBadges]       = useState<Badge[]>([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [showBadgeForm, setShowBadgeForm] = useState(false)
  const [msg, setMsg]             = useState('')
  const [saving, setSaving]       = useState(false)

  const [form, setForm] = useState({
    title: '', metric: 'deals_closed' as Goal['metric'],
    target: '10', period: 'weekly' as Goal['period'],
    profile_id: '',
  })
  const [badgeForm, setBadgeForm] = useState({
    profile_id: '', kind: 'milestone' as Badge['kind'], label: '',
  })

  const router  = useRouter()
  const supabase = createClient()
  const isHost = profile?.role === 'host' || profile?.role === 'cohost'

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!prof) { router.push('/dashboard'); return }
      setProfile(prof)

      const [goalsRes, badgesRes] = await Promise.all([
        supabase.from('goals').select('*').eq('organisation_id', prof.organisation_id).order('created_at', { ascending: false }),
        supabase.from('badges').select('*').eq('organisation_id', prof.organisation_id).order('earned_at', { ascending: false }),
      ])
      setGoals(goalsRes.data || [])
      setBadges(badgesRes.data || [])
      if (prof.role === 'host' || prof.role === 'cohost') {
        const { data: t } = await supabase.from('profiles').select('*').eq('organisation_id', prof.organisation_id)
        setTeam(t || [])
      }
      setLoading(false)
    }
    load()
  }, [])

  // For employees: auto-refresh goal progress from real data
  useEffect(() => {
    if (!profile || isHost) return
    async function refreshProgress() {
      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString()
      const [{ count: dealsCount }, { count: checkInCount }, { count: assignCount }] = await Promise.all([
        supabase.from('deal_logs').select('id', { count: 'exact', head: true })
          .eq('logged_by', profile!.id).eq('outcome', 'closed').gte('created_at', weekAgo),
        supabase.from('check_ins').select('id', { count: 'exact', head: true })
          .eq('employee_id', profile!.id).gte('created_at', weekAgo),
        supabase.from('assignments').select('id', { count: 'exact', head: true })
          .eq('assigned_to', profile!.id).eq('status', 'completed').gte('completed_at', weekAgo),
      ])
      // Update current_value for my personal goals
      for (const g of goals.filter(g => g.profile_id === profile!.id)) {
        const val = g.metric === 'deals_closed' ? dealsCount ?? 0
          : g.metric === 'check_ins' ? checkInCount ?? 0
          : assignCount ?? 0
        await supabase.from('goals').update({ current_value: val }).eq('id', g.id)
      }
      setGoals(prev => prev.map(g => {
        if (g.profile_id !== profile!.id) return g
        const val = g.metric === 'deals_closed' ? dealsCount ?? 0
          : g.metric === 'check_ins' ? checkInCount ?? 0
          : assignCount ?? 0
        return { ...g, current_value: val }
      }))
    }
    if (goals.length > 0) refreshProgress()
  }, [goals.length])

  async function handleSaveGoal(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setSaving(true); setMsg('')
    const { data: { user } } = await supabase.auth.getUser()
    const now = new Date()
    const start = new Date(now); start.setDate(now.getDate() - now.getDay())
    const end = new Date(start); end.setDate(start.getDate() + 6)
    const { data, error } = await supabase.from('goals').insert({
      organisation_id: profile.organisation_id,
      profile_id: form.profile_id || null,
      title: form.title.trim(),
      metric: form.metric,
      target: parseInt(form.target),
      current_value: 0,
      period: form.period,
      period_start: start.toISOString().split('T')[0],
      period_end: end.toISOString().split('T')[0],
      created_by: user!.id,
    }).select().single()
    if (error) { setMsg('Error: ' + error.message) }
    else {
      setGoals(prev => [data, ...prev])
      setForm({ title: '', metric: 'deals_closed', target: '10', period: 'weekly', profile_id: '' })
      setShowForm(false)
      setMsg('Goal created.')
    }
    setSaving(false)
  }

  async function handleAwardBadge(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setSaving(true); setMsg('')
    const { data, error } = await supabase.from('badges').insert({
      organisation_id: profile.organisation_id,
      profile_id: badgeForm.profile_id,
      kind: badgeForm.kind,
      label: badgeForm.label.trim(),
    }).select().single()
    if (error) { setMsg('Error: ' + error.message) }
    else {
      setBadges(prev => [data, ...prev])
      setBadgeForm({ profile_id: '', kind: 'milestone', label: '' })
      setShowBadgeForm(false)
      setMsg('Badge awarded!')
    }
    setSaving(false)
  }

  const profileMap = Object.fromEntries([...(profile ? [profile] : []), ...team].map(p => [p.id, p]))

  // Split: my goals vs team goals
  const myGoals   = goals.filter(g => g.profile_id === profile?.id || g.profile_id === null)
  const teamGoals = goals.filter(g => g.profile_id && g.profile_id !== profile?.id)
  const myBadges  = badges.filter(b => b.profile_id === profile?.id)

  if (loading) return <PageSkeleton variant="list" />

  return (
    <main className="sc-enter min-h-screen bg-page text-hi pb-28">
      <header className="px-5 pt-12 pb-4 border-b border-rim">
        <p className="text-xs text-dim uppercase tracking-widest mb-1">Performance</p>
        <h1 className="text-xl font-bold">Goals & Badges</h1>
      </header>

      {msg && (
        <div className={`mx-5 mt-4 px-4 py-3 rounded-xl text-sm ${msg.startsWith('Error') ? 'bg-red-900/40 text-red-300' : 'bg-green-900/40 text-green-300'}`}>
          {msg}
        </div>
      )}

      <div className="px-5 py-5 space-y-6">

        {/* My Badges */}
        {myBadges.length > 0 && (
          <div>
            <h2 className="text-xs text-dim uppercase tracking-widest mb-3">My Badges</h2>
            <div className="flex flex-wrap gap-2">
              {myBadges.map(b => (
                <div key={b.id} className="bg-card border border-rim rounded-xl px-3 py-2 flex items-center gap-2">
                  <span className="text-xl">{BADGE_EMOJI[b.kind] ?? '🏅'}</span>
                  <div>
                    <p className="text-xs font-semibold text-hi">{b.label}</p>
                    <p className="text-xs text-dim">{new Date(b.earned_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My Goals */}
        <div>
          <h2 className="text-xs text-dim uppercase tracking-widest mb-3">My Goals</h2>
          {myGoals.length === 0
            ? <p className="text-dim text-sm">No goals set yet{isHost ? ' — create one below.' : '.'}</p>
            : myGoals.map(g => <GoalCard key={g.id} goal={g} />)
          }
        </div>

        {/* Host controls */}
        {isHost && (
          <>
            {/* Create goal */}
            <button onClick={() => setShowForm(v => !v)}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition text-sm">
              {showForm ? 'Cancel' : '+ Set a Goal'}
            </button>

            {showForm && (
              <form onSubmit={handleSaveGoal} className="bg-card border border-rim rounded-xl p-4 space-y-3">
                <div>
                  <label className="text-xs text-lo mb-1 block">Goal Title *</label>
                  <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. 10 closed deals this week"
                    className="w-full bg-well border border-rim rounded-xl px-4 py-3 text-sm text-hi placeholder-dim focus:outline-none focus:border-blue-500" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-lo mb-1 block">Metric</label>
                    <select value={form.metric} onChange={e => setForm(f => ({ ...f, metric: e.target.value as Goal['metric'] }))}
                      className="w-full bg-well border border-rim rounded-xl px-3 py-3 text-sm text-hi focus:outline-none focus:border-blue-500">
                      <option value="deals_closed">Deals Closed</option>
                      <option value="check_ins">Check-ins</option>
                      <option value="assignments_completed">Assignments Done</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-lo mb-1 block">Target</label>
                    <input type="number" min="1" required value={form.target}
                      onChange={e => setForm(f => ({ ...f, target: e.target.value }))}
                      className="w-full bg-well border border-rim rounded-xl px-4 py-3 text-sm text-hi focus:outline-none focus:border-blue-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-lo mb-1 block">Period</label>
                    <select value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value as Goal['period'] }))}
                      className="w-full bg-well border border-rim rounded-xl px-3 py-3 text-sm text-hi focus:outline-none focus:border-blue-500">
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-lo mb-1 block">Assign To</label>
                    <select value={form.profile_id} onChange={e => setForm(f => ({ ...f, profile_id: e.target.value }))}
                      className="w-full bg-well border border-rim rounded-xl px-3 py-3 text-sm text-hi focus:outline-none focus:border-blue-500">
                      <option value="">Team (org-wide)</option>
                      {team.map(p => <option key={p.id} value={p.id}>{p.full_name.split(' ')[0]}</option>)}
                    </select>
                  </div>
                </div>
                <button type="submit" disabled={saving || !form.title.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-well disabled:text-dim text-white font-semibold py-3 rounded-xl transition">
                  {saving ? 'Saving…' : 'Set Goal'}
                </button>
              </form>
            )}

            {/* Team goals */}
            {teamGoals.length > 0 && (
              <div>
                <h2 className="text-xs text-dim uppercase tracking-widest mb-3">Team Goals</h2>
                <div className="space-y-3">
                  {teamGoals.map(g => (
                    <GoalCard key={g.id} goal={g} profileName={profileMap[g.profile_id!]?.full_name} />
                  ))}
                </div>
              </div>
            )}

            {/* Award badge */}
            <div>
              <h2 className="text-xs text-dim uppercase tracking-widest mb-3">Award a Badge</h2>
              <button onClick={() => setShowBadgeForm(v => !v)}
                className="w-full border border-rim bg-well text-hi font-semibold py-3 rounded-xl transition text-sm hover:border-blue-500/50">
                {showBadgeForm ? 'Cancel' : '🏅 Award Badge'}
              </button>

              {showBadgeForm && (
                <form onSubmit={handleAwardBadge} className="mt-3 bg-card border border-rim rounded-xl p-4 space-y-3">
                  <div>
                    <label className="text-xs text-lo mb-1 block">Team Member *</label>
                    <select required value={badgeForm.profile_id} onChange={e => setBadgeForm(f => ({ ...f, profile_id: e.target.value }))}
                      className="w-full bg-well border border-rim rounded-xl px-3 py-3 text-sm text-hi focus:outline-none focus:border-blue-500">
                      <option value="">Select…</option>
                      {team.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-lo mb-1 block">Badge Type</label>
                    <select value={badgeForm.kind} onChange={e => setBadgeForm(f => ({ ...f, kind: e.target.value as Badge['kind'] }))}
                      className="w-full bg-well border border-rim rounded-xl px-3 py-3 text-sm text-hi focus:outline-none focus:border-blue-500">
                      <option value="first_deal">🎯 First Deal</option>
                      <option value="streak_3">🔥 3-Day Streak</option>
                      <option value="streak_7">⚡ 7-Day Streak</option>
                      <option value="top_closer">🏆 Top Closer</option>
                      <option value="mvp">⭐ MVP</option>
                      <option value="milestone">🏅 Milestone</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-lo mb-1 block">Label *</label>
                    <input required value={badgeForm.label} onChange={e => setBadgeForm(f => ({ ...f, label: e.target.value }))}
                      placeholder="e.g. First closed deal!"
                      className="w-full bg-well border border-rim rounded-xl px-4 py-3 text-sm text-hi placeholder-dim focus:outline-none focus:border-blue-500" />
                  </div>
                  <button type="submit" disabled={saving || !badgeForm.profile_id || !badgeForm.label.trim()}
                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-well disabled:text-dim text-white font-semibold py-3 rounded-xl transition">
                    {saving ? 'Awarding…' : 'Award Badge'}
                  </button>
                </form>
              )}

              {/* All org badges */}
              {badges.length > 0 && (
                <div className="mt-4 space-y-2">
                  {badges.map(b => (
                    <div key={b.id} className="bg-card border border-rim rounded-xl px-4 py-2 flex items-center gap-3">
                      <span className="text-xl">{BADGE_EMOJI[b.kind] ?? '🏅'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-hi">{b.label}</p>
                        <p className="text-xs text-dim">{profileMap[b.profile_id]?.full_name ?? 'Team member'}</p>
                      </div>
                      <span className="text-xs text-dim shrink-0">{new Date(b.earned_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
      <Nav role={profile!.role} />
    </main>
  )
}
