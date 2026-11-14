'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import AppHeader from '@/components/AppHeader'
import PageSkeleton from '@/components/Skeleton'
import type { Profile, Assignment, Announcement, PulseEntry } from '@/lib/types'
import { usePushSubscription } from '@/lib/usePushSubscription'

export default function DashboardPage() {
  const [profile,       setProfile]       = useState<Profile | null>(null)
  const [assignments,   setAssignments]   = useState<Assignment[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [dismissed,     setDismissed]     = useState<Set<string>>(new Set())
  const [todayPulse,    setTodayPulse]    = useState<PulseEntry | null | undefined>(undefined)
  const [pulseScore,    setPulseScore]    = useState(3)
  const [pulseNote,     setPulseNote]     = useState('')
  const [savingPulse,   setSavingPulse]   = useState(false)
  const [loading,       setLoading]       = useState(true)
  const router  = useRouter()
  usePushSubscription((profile as any)?.organisation_id ?? null)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: prof } = await supabase
        .from('profiles').select('*').eq('id', user.id).single()
      if (!prof) { router.push('/onboard'); return }

      if (!prof.onboarded && prof.role === 'employee') {
        router.push('/onboard/employee'); return
      }

      setProfile(prof)

      const today = new Date(); today.setHours(0,0,0,0)
      const isHost = prof.role === 'host' || prof.role === 'cohost'
      const q = supabase.from('assignments').select('*')
        .eq('organisation_id', prof.organisation_id)

      const [
        { data: a },
        { data: ann },
        { data: dis },
        { data: pulse },
      ] = await Promise.all([
        isHost
          ? q.neq('status', 'cancelled').order('created_at', { ascending: false }).limit(50)
          : q.eq('assigned_to', user.id).neq('status', 'cancelled').order('created_at', { ascending: false }).limit(20),
        supabase.from('announcements').select('*')
          .eq('organisation_id', prof.organisation_id).eq('pinned', true)
          .order('created_at', { ascending: false }),
        supabase.from('announcement_dismissals').select('announcement_id')
          .eq('profile_id', user.id),
        supabase.from('pulse_entries').select('*')
          .eq('organisation_id', prof.organisation_id)
          .eq('employee_id', user.id)
          .gte('created_at', today.toISOString())
          .limit(1),
      ])

      setAssignments(a || [])
      setAnnouncements(ann || [])
      setDismissed(new Set((dis || []).map((d: { announcement_id: string }) => d.announcement_id)))
      setTodayPulse(pulse && pulse.length > 0 ? pulse[0] : null)
      setLoading(false)
    }
    load()
  }, [])

  async function dismissAnnouncement(id: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('announcement_dismissals').insert({ announcement_id: id, profile_id: user.id })
    setDismissed(prev => new Set([...prev, id]))
  }

  async function submitPulse() {
    if (!profile) return
    setSavingPulse(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('pulse_entries').insert({
      organisation_id: profile.organisation_id,
      employee_id: user.id,
      score: pulseScore,
      note: pulseNote.trim() || null,
    }).select().single()
    if (data) setTodayPulse(data)
    setSavingPulse(false)
  }

  if (loading) return <PageSkeleton variant="dashboard" />

  if (!profile) return null

  const isHost   = profile.role === 'host' || profile.role === 'cohost'
  const pending    = assignments.filter(a => a.status === 'pending').length
  const inProgress = assignments.filter(a => a.status === 'in_progress' || a.status === 'acknowledged').length
  const completed  = assignments.filter(a => a.status === 'completed').length

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <main className="sc-enter min-h-screen bg-page text-hi pb-32">
      {/* Header */}
      <AppHeader
        organisationId={profile.organisation_id}
        title={`${greeting()}, ${profile.full_name.split(' ')[0]}`}
        subtitle={`${profile.role.charAt(0).toUpperCase()+profile.role.slice(1)}${profile.group_name ? ` · ${profile.group_name}` : ''}`}
      />

      <div className="px-5 space-y-6">
        {/* Announcements */}
        {announcements.filter(a => !dismissed.has(a.id)).map(a => (
          <div key={a.id} className="bg-blue-900/30 border border-blue-700/40 rounded-xl px-4 py-3 flex items-start gap-3">
            <span className="text-lg mt-0.5">📢</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-blue-200 leading-snug">{a.body}</p>
              <p className="text-xs text-blue-400 mt-1">{new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
            </div>
            <button onClick={() => dismissAnnouncement(a.id)} className="text-blue-400 hover:text-blue-200 text-lg leading-none shrink-0 mt-0.5">×</button>
          </div>
        ))}

        {/* Daily Pulse */}
        {todayPulse === null && (
          <div className="sc-card-depth p-4">
            <h2 className="text-xs text-dim uppercase tracking-widest mb-3">Daily Pulse</h2>
            <p className="text-xs text-dim mb-3">How&apos;s the floor feeling today?</p>
            <div className="flex justify-between gap-2 mb-3">
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setPulseScore(n)}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition border ${pulseScore === n ? 'bg-blue-600 border-blue-500 text-white' : 'bg-well border-rim text-dim'}`}>
                  {n}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-dim mb-3">
              <span>Rough</span><span>Great</span>
            </div>
            <textarea
              value={pulseNote}
              onChange={e => setPulseNote(e.target.value)}
              placeholder="Any notes? (optional)"
              rows={2}
              className="w-full bg-well border border-rim rounded-lg px-3 py-2 text-sm text-hi placeholder-dim resize-none mb-3"
            />
            <button onClick={submitPulse} disabled={savingPulse}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition text-sm">
              {savingPulse ? 'Saving…' : 'Submit Pulse'}
            </button>
          </div>
        )}
        {todayPulse && (
          <div className="sc-card-depth px-4 py-3 flex items-center gap-3">
            <span className="text-xl">{todayPulse.score >= 4 ? '🟢' : todayPulse.score >= 3 ? '🟡' : '🔴'}</span>
            <div>
              <p className="text-sm font-medium text-hi">Pulse submitted — {todayPulse.score}/5</p>
              {todayPulse.note && <p className="text-xs text-dim mt-0.5">{todayPulse.note}</p>}
            </div>
          </div>
        )}

        {/* Stats — large numbers */}
        <div className="grid grid-cols-3 gap-2.5">
          {([
            { label: 'Pending',  value: pending,    accent: '#94a3b8' },
            { label: 'Active',   value: inProgress, accent: 'var(--sc-brand)' },
            { label: 'Closed',   value: completed,  accent: '#4ade80' },
          ] as const).map(s => (
            <div key={s.label} className="sc-stat-tile text-center">
              <div className="text-4xl font-black leading-none mb-1" style={{ color: s.accent }}>{s.value}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-dim">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Quick links */}
        <div className="space-y-2">
          <h2 className="sc-section-label mb-3">Quick Access</h2>
          {isHost ? (
            <>
              <QuickLink href="/assignments" title="Assignments"
                subtitle={`${pending} pending · ${inProgress} active`}
                icon="📋" accent="var(--sc-brand)" />
              <QuickLink href="/map" title="Deal Map" subtitle="Live field activity" icon="🗺" accent="#38bdf8" />
              <QuickLink href="/customers" title="Customers" subtitle="CRM & timelines" icon="👥" accent="#a78bfa" />
              <QuickLink href="/intelligence" title="Intelligence" subtitle="Reports & contracts" icon="📊" accent="#34d399" />
              <QuickLink href="/goals" title="Goals & Badges" subtitle="Team performance" icon="🏆" accent="#fbbf24" />
              <QuickLink href="/reminders" title="Reminders" subtitle="Upcoming alerts" icon="⏰" accent="#f87171" />
              <QuickLink href="/vault" title="Document Vault" subtitle="Files & uploads" icon="📁" accent="#94a3b8" />
            </>
          ) : (
            <>
              <QuickLink href="/my-work" title="My Work"
                subtitle={`${pending + inProgress} open assignments`}
                icon="💼" accent="var(--sc-brand)" />
              <QuickLink href="/map" title="Deal Map" subtitle="Team activity" icon="🗺" accent="#38bdf8" />
              <QuickLink href="/route" title="Route Planner" subtitle="Plan your day" icon="🧭" accent="#34d399" />
              <QuickLink href="/customers" title="Customers" subtitle="Your contacts" icon="👥" accent="#a78bfa" />
              <QuickLink href="/goals" title="Goals & Badges" subtitle="Your progress" icon="🏆" accent="#fbbf24" />
              <QuickLink href="/reminders" title="Reminders" subtitle="Upcoming alerts" icon="⏰" accent="#f87171" />
              <QuickLink href="/vault" title="Document Vault" subtitle="Field resources" icon="📁" accent="#94a3b8" />
            </>
          )}
        </div>

        {/* Empty state */}
        {assignments.length === 0 && (
          <div className="sc-card-depth px-5 py-8 text-center border-dashed border-rim2">
            <p className="text-3xl mb-2">{isHost ? '📋' : '🎯'}</p>
            <p className="text-sm font-semibold text-hi">
              {isHost ? 'No assignments yet' : "You're all caught up"}
            </p>
            <p className="text-xs text-dim mt-1">
              {isHost
                ? 'Create your first assignment and it will show up here.'
                : 'New assignments from your manager will appear here.'}
            </p>
            {isHost && (
              <a
                href="/assignments"
                className="inline-block mt-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
              >
                Create assignment
              </a>
            )}
          </div>
        )}

        {/* Recent activity feed */}
        {assignments.length > 0 && (
          <div>
            <h2 className="sc-section-label mb-3">Recent Activity</h2>
            <div className="space-y-2">
            {assignments.slice(0, 5).map(a => {
              const statusColor =
                a.status === 'completed'    ? '#4ade80' :
                a.status === 'in_progress'  ? 'var(--sc-brand)' :
                a.status === 'acknowledged' ? '#c084fc' : '#55556a'
              const statusLabel =
                a.status === 'completed'    ? 'Closed'  :
                a.status === 'in_progress'  ? 'Active'  :
                a.status === 'acknowledged' ? 'Ack'     : 'Pending'
              const badgeCls =
                a.status === 'completed'    ? 'sc-badge sc-badge-green'  :
                a.status === 'in_progress'  ? 'sc-badge sc-badge-blue'   :
                a.status === 'acknowledged' ? 'sc-badge sc-badge-purple' :
                                             'sc-badge sc-badge-gray'
              return (
                <a key={a.id} href="/assignments"
                  className="sc-feed-item flex items-center justify-between gap-3"
                  style={{ borderLeftColor: statusColor }}>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-hi leading-snug truncate">{a.title}</p>
                    {a.address && <p className="text-xs text-dim mt-0.5 truncate">{a.address}</p>}
                  </div>
                  <span className={badgeCls}>{statusLabel}</span>
                </a>
              )
            })}
            </div>
          </div>
        )}
      </div>

      <Nav role={profile.role} />
    </main>
  )
}

function QuickLink({ href, title, subtitle, icon, accent }: {
  href: string; title: string; subtitle: string; icon: string; accent?: string
}) {
  return (
    <a
      href={href}
      className="sc-feed-item flex items-center gap-3.5"
      style={{ borderLeftColor: accent || 'var(--sc-brand)' }}
    >
      <span className="text-xl shrink-0 w-7 text-center">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-hi leading-snug">{title}</p>
        <p className="text-xs text-dim mt-0.5">{subtitle}</p>
      </div>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
        className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--sc-dim)' }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </a>
  )
}
