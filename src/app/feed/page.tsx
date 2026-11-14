'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import AppHeader from '@/components/AppHeader'
import type { Profile, Assignment, PulseEntry, FrictionReport, Announcement, DealLog } from '@/lib/types'

type EventKind = 'assignment' | 'deal' | 'pulse' | 'friction' | 'announcement' | 'checkin'
type Severity  = 'critical' | 'high' | 'medium' | 'low' | 'info'

type FeedEvent = {
  id: string
  kind: EventKind
  severity: Severity
  title: string
  subtitle: string
  group?: string
  status?: string
  ts: string
  raw?: unknown
}

const severityColor: Record<Severity, string> = {
  critical: '#f87171',
  high:     '#fb923c',
  medium:   '#fbbf24',
  low:      '#38bdf8',
  info:     '#94a3b8',
}
const severityBadge: Record<Severity, string> = {
  critical: 'sc-badge sc-badge-red',
  high:     'sc-badge sc-badge-amber',
  medium:   'sc-badge sc-badge-amber',
  low:      'sc-badge sc-badge-blue',
  info:     'sc-badge sc-badge-gray',
}
const kindIcon: Record<EventKind, string> = {
  assignment:   '📋',
  deal:         '💼',
  pulse:        '💓',
  friction:     '⚠️',
  announcement: '📢',
  checkin:      '📍',
}

function assignmentToEvent(a: Assignment): FeedEvent {
  const sev: Severity = a.priority === 'urgent' ? 'critical' : a.priority === 'high' ? 'high' : a.priority === 'normal' ? 'medium' : 'low'
  const statusLabel = a.status === 'completed' ? 'Closed' : a.status === 'in_progress' ? 'Active' : a.status === 'acknowledged' ? 'Ack' : 'Pending'
  return { id: `a-${a.id}`, kind: 'assignment', severity: sev, title: a.title, subtitle: a.address || a.description || 'No location', group: a.group_name || undefined, status: statusLabel, ts: a.created_at, raw: a }
}
function dealToEvent(d: DealLog): FeedEvent {
  const sev: Severity = d.outcome === 'closed' ? 'info' : d.outcome === 'lost' ? 'high' : 'medium'
  const label = d.outcome === 'closed' ? '🟢 Deal closed' : d.outcome === 'lost' ? '🔴 Deal lost' : d.outcome === 'follow_up' ? '🔵 Follow-up' : 'No contact'
  return { id: `d-${d.id}`, kind: 'deal', severity: sev, title: label, subtitle: d.notes?.slice(0, 80) || d.objection_type || '', ts: d.created_at, raw: d }
}
function frictionToEvent(f: FrictionReport): FeedEvent {
  const labels: Record<FrictionReport['category'], string> = { hoa: 'HOA restriction', dangerous: 'Safety concern', competitor: 'Competitor activity', no_soliciting: 'No soliciting', other: 'Friction reported' }
  return { id: `f-${f.id}`, kind: 'friction', severity: 'high', title: labels[f.category], subtitle: f.address || f.note || '', ts: f.created_at, raw: f }
}
function annToEvent(a: Announcement): FeedEvent {
  return { id: `an-${a.id}`, kind: 'announcement', severity: 'info', title: 'Announcement', subtitle: a.body.slice(0, 100), ts: a.created_at, raw: a }
}
function pulseToEvent(p: PulseEntry, label: string): FeedEvent {
  const sev: Severity = p.score >= 4 ? 'info' : p.score >= 3 ? 'low' : p.score >= 2 ? 'medium' : 'high'
  return { id: `p-${p.id}`, kind: 'pulse', severity: sev, title: `Pulse: ${label} rated ${p.score}/5`, subtitle: p.note || 'No note', ts: p.created_at, raw: p }
}

type FilterKind = EventKind | 'all'
type FilterSev  = Severity  | 'all'

export default function FeedPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [events,  setEvents]  = useState<FeedEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [filterK, setFilterK] = useState<FilterKind>('all')
  const [filterS, setFilterS] = useState<FilterSev>('all')
  const [liveAt,  setLiveAt]  = useState<string | null>(null)
  const router  = useRouter()
  const supabase = createClient()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!prof) { router.push('/onboard'); return }
    setProfile(prof)

    const oid = prof.organisation_id
    const isHost = prof.role === 'host' || prof.role === 'cohost'

    const [
      { data: assigns },
      { data: deals   },
      { data: fricts  },
      { data: anns    },
      { data: pulses  },
    ] = await Promise.all([
      supabase.from('assignments').select('*').eq('organisation_id', oid).order('created_at', { ascending: false }).limit(isHost ? 40 : 20),
      isHost ? supabase.from('deal_logs').select('*').eq('organisation_id', oid).order('created_at', { ascending: false }).limit(30) : { data: [] },
      isHost ? supabase.from('friction_tags').select('*').eq('organisation_id', oid).order('created_at', { ascending: false }).limit(20) : { data: [] },
      supabase.from('announcements').select('*').eq('organisation_id', oid).order('created_at', { ascending: false }).limit(10),
      isHost ? supabase.from('pulse_entries').select('*').eq('organisation_id', oid).order('created_at', { ascending: false }).limit(30) : { data: [] },
    ])

    const ev: FeedEvent[] = [
      ...(assigns  || []).map(assignmentToEvent),
      ...(deals    || []).map(dealToEvent),
      ...(fricts   || []).map((f: FrictionReport) => frictionToEvent(f)),
      ...(anns     || []).map(annToEvent),
      ...(pulses   || []).map((p: PulseEntry) => pulseToEvent(p, 'Team member')),
    ].sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())

    setEvents(ev)
    setLiveAt(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [])

  if (loading) return <main className="min-h-screen bg-page text-hi flex items-center justify-center"><div className="text-dim text-sm">Loading feed…</div></main>
  if (!profile) return null

  const filtered = events.filter(e => (filterK === 'all' || e.kind === filterK) && (filterS === 'all' || e.severity === filterS))

  const kindOptions: { v: FilterKind; label: string }[] = [
    { v: 'all',          label: 'All' },
    { v: 'assignment',   label: '📋 Tasks' },
    { v: 'deal',         label: '💼 Deals' },
    { v: 'friction',     label: '⚠️ Friction' },
    { v: 'announcement', label: '📢 Alerts' },
    { v: 'pulse',        label: '💓 Pulse' },
  ]
  const sevOptions: { v: FilterSev; label: string }[] = [
    { v: 'all',      label: 'All severity' },
    { v: 'critical', label: '🔴 Critical' },
    { v: 'high',     label: '🟠 High' },
    { v: 'medium',   label: '🟡 Medium' },
    { v: 'low',      label: '🔵 Low' },
    { v: 'info',     label: '⚪ Info' },
  ]

  return (
    <main className="sc-enter min-h-screen bg-page text-hi pb-32">
      <AppHeader organisationId={profile.organisation_id} title="Live Feed" subtitle={liveAt ? `Updated ${liveAt}` : 'Workspace events'} />
      <div className="px-5 space-y-4">

        {/* Live indicator + refresh */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs font-bold text-green-400">LIVE</span>
            <span className="text-xs text-dim">{events.length} events</span>
          </div>
          <button onClick={load} className="text-xs text-blue-400 font-semibold px-3 py-1.5 rounded-lg border border-blue-500/20 hover:bg-blue-900/10 transition">↺ Refresh</button>
        </div>

        {/* Kind filter — horizontal scroll */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
          {kindOptions.map(o => (
            <button key={o.v} onClick={() => setFilterK(o.v)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition ${filterK === o.v ? 'text-white border-transparent' : 'text-dim border-rim bg-well'}`}
              style={filterK === o.v ? { background: 'var(--sc-brand)' } : {}}>
              {o.label}
            </button>
          ))}
        </div>

        {/* Severity filter */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
          {sevOptions.map(o => (
            <button key={o.v} onClick={() => setFilterS(o.v)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition ${filterS === o.v ? 'text-white border-transparent' : 'text-dim border-rim bg-well'}`}
              style={filterS === o.v ? { background: 'var(--sc-brand)' } : {}}>
              {o.label}
            </button>
          ))}
        </div>

        {/* Feed */}
        {filtered.length === 0 && (
          <div className="sc-card-depth px-5 py-10 text-center border-dashed border-rim2">
            <p className="text-3xl mb-2">📡</p>
            <p className="text-sm font-bold text-hi">Nothing here yet</p>
            <p className="text-xs text-dim mt-1">Events from your workspace will appear as they happen.</p>
          </div>
        )}

        <div className="space-y-2">
          {filtered.map(ev => {
            const ago = (() => {
              const diff = Date.now() - new Date(ev.ts).getTime()
              const mins = Math.floor(diff / 60000)
              if (mins < 1)  return 'just now'
              if (mins < 60) return `${mins}m ago`
              const hrs = Math.floor(mins / 60)
              if (hrs < 24)  return `${hrs}h ago`
              return `${Math.floor(hrs / 24)}d ago`
            })()
            return (
              <div key={ev.id} className="sc-feed-item flex items-start gap-3" style={{ borderLeftColor: severityColor[ev.severity] }}>
                <span className="text-xl mt-0.5 shrink-0">{kindIcon[ev.kind]}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-hi leading-snug">{ev.title}</p>
                    {ev.status && <span className="sc-badge sc-badge-gray text-[9px]">{ev.status}</span>}
                    <span className={`${severityBadge[ev.severity]} text-[9px]`}>{ev.severity}</span>
                  </div>
                  {ev.subtitle && <p className="text-xs text-dim mt-0.5 leading-snug line-clamp-2">{ev.subtitle}</p>}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] text-dim">{ago}</span>
                    {ev.group && <><span className="text-[10px] text-dim">·</span><span className="text-[10px] text-dim">{ev.group}</span></>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <Nav role={profile.role} />
    </main>
  )
}
