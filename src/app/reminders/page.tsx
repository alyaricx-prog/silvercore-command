'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import type { Profile, Assignment } from '@/lib/types'

type Reminder = {
  id: string
  organisation_id: string
  created_by: string | null
  assigned_to: string | null
  assignment_id: string | null
  title: string
  body: string | null
  remind_at: string
  sent: boolean
  created_at: string
}

function formatDT(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

function relativeTime(iso: string) {
  const diff = new Date(iso).getTime() - Date.now()
  const abs = Math.abs(diff)
  const mins = Math.floor(abs / 60000)
  const hours = Math.floor(abs / 3600000)
  const days = Math.floor(abs / 86400000)
  const past = diff < 0
  if (mins < 1) return 'now'
  if (mins < 60) return past ? `${mins}m ago` : `in ${mins}m`
  if (hours < 24) return past ? `${hours}h ago` : `in ${hours}h`
  return past ? `${days}d ago` : `in ${days}d`
}

export default function RemindersPage() {
  const [profile, setProfile]       = useState<Profile | null>(null)
  const [reminders, setReminders]   = useState<Reminder[]>([])
  const [profiles, setProfiles]     = useState<Profile[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [showForm, setShowForm]     = useState(false)
  const [filter, setFilter]         = useState<'upcoming' | 'past'>('upcoming')

  // form state
  const [title, setTitle]           = useState('')
  const [body, setBody]             = useState('')
  const [remindAt, setRemindAt]     = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [assignmentId, setAssignmentId] = useState('')

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!prof) { router.push('/auth/login'); return }
      setProfile(prof)
      const isHost = prof.role === 'host' || prof.role === 'cohost'

      const queries: Promise<unknown>[] = [
        supabase.from('reminders').select('*')
          .eq('organisation_id', prof.organisation_id)
          .order('remind_at', { ascending: true }),
      ]
      if (isHost) {
        queries.push(
          supabase.from('profiles').select('*').eq('organisation_id', prof.organisation_id),
          supabase.from('assignments').select('*')
            .eq('organisation_id', prof.organisation_id).eq('status', 'open').limit(100),
        )
      }
      const [remRes, profRes, assRes] = await Promise.all(queries) as any[]
      setReminders(remRes?.data || [])
      if (profRes) setProfiles(profRes.data || [])
      if (assRes) setAssignments(assRes.data || [])
      setLoading(false)
    }
    load()
  }, [])

  const isHost = profile?.role === 'host' || profile?.role === 'cohost'

  // For employees: only show their own or org-wide reminders
  const visible = isHost
    ? reminders
    : reminders.filter(r => r.assigned_to === profile?.id || r.assigned_to === null)

  const now = new Date().toISOString()
  const filtered = visible.filter(r =>
    filter === 'upcoming' ? r.remind_at >= now : r.remind_at < now
  )

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!profile || !title.trim() || !remindAt) return
    setSaving(true)
    const { data, error } = await supabase.from('reminders').insert({
      organisation_id: profile.organisation_id,
      created_by: profile.id,
      assigned_to: assignedTo || null,
      assignment_id: assignmentId || null,
      title: title.trim(),
      body: body.trim() || null,
      remind_at: new Date(remindAt).toISOString(),
    }).select().single()
    if (!error && data) {
      setReminders(prev => [data, ...prev].sort((a, b) =>
        new Date(a.remind_at).getTime() - new Date(b.remind_at).getTime()))
      setTitle(''); setBody(''); setRemindAt('')
      setAssignedTo(''); setAssignmentId('')
      setShowForm(false)
    }
    setSaving(false)
  }

  async function deleteReminder(id: string) {
    await supabase.from('reminders').delete().eq('id', id)
    setReminders(prev => prev.filter(r => r.id !== id))
  }

  if (loading) return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--sc-page)' }}>
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  return (
    <main className="min-h-screen pb-20" style={{ background: 'var(--sc-page)', color: 'var(--sc-hi)' }}>
      <div className="max-w-lg mx-auto px-4 pt-14">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold">Reminders</h1>
            <p className="text-xs text-dim mt-0.5">
              {visible.filter(r => r.remind_at >= now).length} upcoming
            </p>
          </div>
          {isHost && (
            <button
              onClick={() => setShowForm(o => !o)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-semibold"
            >
              <span className="text-base leading-none">+</span> New
            </button>
          )}
        </div>

        {/* Create form (host only) */}
        {showForm && isHost && (
          <div className="rounded-2xl border border-rim p-4 mb-6 sc-enter"
               style={{ background: 'var(--sc-card)' }}>
            <h2 className="font-semibold mb-3 text-sm">New Reminder</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <input
                type="text" placeholder="Title *" required
                value={title} onChange={e => setTitle(e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-sm border border-rim2 outline-none focus:border-blue-500"
                style={{ background: 'var(--sc-well)', color: 'var(--sc-hi)' }}
              />
              <textarea
                placeholder="Details (optional)"
                value={body} onChange={e => setBody(e.target.value)} rows={2}
                className="w-full rounded-xl px-3 py-2 text-sm border border-rim2 outline-none focus:border-blue-500 resize-none"
                style={{ background: 'var(--sc-well)', color: 'var(--sc-hi)' }}
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-dim block mb-1">Date & Time *</label>
                  <input
                    type="datetime-local" required
                    value={remindAt} onChange={e => setRemindAt(e.target.value)}
                    className="w-full rounded-xl px-3 py-2 text-sm border border-rim2 outline-none focus:border-blue-500"
                    style={{ background: 'var(--sc-well)', color: 'var(--sc-hi)' }}
                  />
                </div>
                <div>
                  <label className="text-xs text-dim block mb-1">Assign to (optional)</label>
                  <select
                    value={assignedTo} onChange={e => setAssignedTo(e.target.value)}
                    className="w-full rounded-xl px-3 py-2 text-sm border border-rim2 outline-none focus:border-blue-500"
                    style={{ background: 'var(--sc-well)', color: 'var(--sc-hi)' }}
                  >
                    <option value="">All members</option>
                    {profiles.map(p => (
                      <option key={p.id} value={p.id}>{p.full_name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-dim block mb-1">Link to assignment (optional)</label>
                <select
                  value={assignmentId} onChange={e => setAssignmentId(e.target.value)}
                  className="w-full rounded-xl px-3 py-2 text-sm border border-rim2 outline-none focus:border-blue-500"
                  style={{ background: 'var(--sc-well)', color: 'var(--sc-hi)' }}
                >
                  <option value="">— none —</option>
                  {assignments.map(a => (
                    <option key={a.id} value={a.id}>{a.address} {a.group_name ? `(${a.group_name})` : ''}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="submit" disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-blue-500 text-white font-semibold text-sm disabled:opacity-50"
                >{saving ? 'Saving…' : 'Create Reminder'}</button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 rounded-xl border border-rim text-sm font-medium"
                  style={{ color: 'var(--sc-lo)' }}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-1 p-1 rounded-xl mb-5"
             style={{ background: 'var(--sc-well)' }}>
          {(['upcoming', 'past'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={filter === f
                ? { background: 'var(--sc-card)', color: 'var(--sc-hi)', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }
                : { color: 'var(--sc-dim)' }}>
              {f === 'upcoming' ? '⏰ Upcoming' : '✅ Past'}
            </button>
          ))}
        </div>

        {/* Reminder list */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">⏰</p>
            <p className="font-semibold text-sm">No {filter} reminders</p>
            <p className="text-xs text-dim mt-1">
              {filter === 'upcoming' && isHost ? 'Create a reminder to get started.' : ''}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(r => {
              const isPast = new Date(r.remind_at) < new Date()
              const assignee = profiles.find(p => p.id === r.assigned_to)
              const linked = assignments.find(a => a.id === r.assignment_id)
              return (
                <div key={r.id}
                     className="rounded-2xl border p-4 sc-enter"
                     style={{
                       background: 'var(--sc-card)',
                       borderColor: isPast ? 'var(--sc-rim)' : 'rgba(59,130,246,0.3)',
                     }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`font-semibold text-sm ${isPast ? 'text-dim line-through' : ''}`}
                              style={{ color: isPast ? undefined : 'var(--sc-hi)' }}>
                          {r.title}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          isPast
                            ? 'bg-gray-500/15 text-gray-400'
                            : 'bg-blue-500/15 text-blue-400'
                        }`}>
                          {relativeTime(r.remind_at)}
                        </span>
                      </div>
                      {r.body && <p className="text-xs text-dim mb-2">{r.body}</p>}
                      <div className="flex items-center gap-3 flex-wrap text-xs text-dim">
                        <span>🕐 {formatDT(r.remind_at)}</span>
                        {assignee
                          ? <span>👤 {assignee.full_name}</span>
                          : <span>📢 All members</span>
                        }
                        {linked && <span>📍 {linked.address.substring(0, 30)}…</span>}
                      </div>
                    </div>
                    {isHost && (
                      <button onClick={() => deleteReminder(r.id)}
                        className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-dim hover:text-red-400 transition-colors"
                        style={{ background: 'var(--sc-well)' }}>
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <Nav role={profile!.role} />
    </main>
  )
}
