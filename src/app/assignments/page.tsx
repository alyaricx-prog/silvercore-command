'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import AssignmentCard from '@/components/AssignmentCard'
import type { Profile, Assignment } from '@/lib/types'

type Tab = 'list' | 'create' | 'team'

export default function AssignmentsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [team, setTeam] = useState<Profile[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [tab, setTab] = useState<Tab>('list')
  const [filter, setFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const router = useRouter()
  const supabase = createClient()

  // Create form state
  const [form, setForm] = useState({
    title: '', description: '', assigned_to: '',
    priority: 'normal' as Assignment['priority'],
    due_at: '',
  })

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteGroup, setInviteGroup] = useState('')
  const [inviting, setInviting] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!prof || (prof.role !== 'host' && prof.role !== 'cohost')) {
        router.push('/dashboard'); return
      }
      setProfile(prof)

      const [{ data: t }, { data: a }] = await Promise.all([
        supabase.from('profiles').select('*').eq('organisation_id', prof.organisation_id).neq('id', user.id),
        supabase.from('assignments').select('*').eq('organisation_id', prof.organisation_id).order('created_at', { ascending: false }),
      ])
      setTeam(t || [])
      setAssignments(a || [])
      setLoading(false)
    }
    load()
  }, [])

  const profileMap = Object.fromEntries(team.map(p => [p.id, p]))

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!profile || !form.title.trim()) return
    setSaving(true)
    setMsg('')
    const { data: { user } } = await supabase.auth.getUser()
    const payload = {
      organisation_id: profile.organisation_id,
      title: form.title.trim(),
      description: form.description.trim() || null,
      assigned_to: form.assigned_to || null,
      created_by: user!.id,
      priority: form.priority,
      due_at: form.due_at || null,
      status: 'pending',
    }
    const { data, error } = await supabase.from('assignments').insert(payload).select().single()
    if (error) { setMsg('Error: ' + error.message) }
    else {
      setAssignments(prev => [data, ...prev])
      setForm({ title: '', description: '', assigned_to: '', priority: 'normal', due_at: '' })
      setTab('list')
      setMsg('Assignment created.')
    }
    setSaving(false)
  }

  async function handleStatusChange(id: string, status: Assignment['status']) {
    await supabase.from('assignments').update({ status, ...(status === 'completed' ? { completed_at: new Date().toISOString() } : {}) }).eq('id', id)
    setAssignments(prev => prev.map(a => a.id === id ? { ...a, status } : a))
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEmail.trim() || !inviteName.trim() || !profile) return
    setInviting(true)
    setMsg('')
    // Create auth user via admin invite (requires service role) - fallback: show SQL
    // For now, we'll attempt signUp and create profile
    const tempPw = Math.random().toString(36).slice(2) + 'Aa1!'
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: inviteEmail.trim(),
      password: tempPw,
      options: { data: { full_name: inviteName.trim() } }
    })
    if (authErr) { setMsg('Error: ' + authErr.message); setInviting(false); return }
    if (authData.user) {
      const { error: profErr } = await supabase.from('profiles').insert({
        id: authData.user.id,
        organisation_id: profile.organisation_id,
        full_name: inviteName.trim(),
        phone: '',
        avatar_url: '',
        role: 'employee',
        group_name: inviteGroup.trim() || 'A',
        is_active: true,
      })
      if (profErr) { setMsg('Auth OK but profile error: ' + profErr.message) }
      else {
        const { data: newProf } = await supabase.from('profiles').select('*').eq('id', authData.user.id).single()
        if (newProf) setTeam(prev => [...prev, newProf])
        setMsg(`Team member added. Temp password: ${tempPw} — share with them to log in.`)
        setInviteEmail(''); setInviteName(''); setInviteGroup('')
      }
    }
    setInviting(false)
  }

  const filtered = filter === 'all' ? assignments : assignments.filter(a => a.status === filter)

  if (loading) return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  return (
    <main className="min-h-screen bg-gray-950 text-white pb-24">
      <header className="px-5 pt-12 pb-4 border-b border-gray-800">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Command</p>
        <h1 className="text-xl font-bold">Assignments</h1>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        {(['list', 'create', 'team'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setMsg('') }}
            className={`flex-1 py-3 text-sm font-medium capitalize transition ${
              tab === t ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500'
            }`}
          >
            {t === 'list' ? `List (${assignments.length})` : t === 'create' ? '+ Create' : `Team (${team.length})`}
          </button>
        ))}
      </div>

      {msg && (
        <div className={`mx-5 mt-4 px-4 py-3 rounded-xl text-sm ${msg.startsWith('Error') ? 'bg-red-900/40 text-red-300' : 'bg-green-900/40 text-green-300'}`}>
          {msg}
        </div>
      )}

      {/* LIST */}
      {tab === 'list' && (
        <div className="px-5 py-4 space-y-4">
          {/* Filter */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {['all','pending','acknowledged','in_progress','completed'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium capitalize transition ${
                  filter === f ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'
                }`}
              >
                {f.replace('_', ' ')}
              </button>
            ))}
          </div>
          {filtered.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-12">No assignments yet.</p>
          ) : (
            filtered.map(a => (
              <AssignmentCard
                key={a.id}
                assignment={a}
                assignee={a.assigned_to ? profileMap[a.assigned_to] : null}
                onStatusChange={handleStatusChange}
                isEmployee={false}
              />
            ))
          )}
        </div>
      )}

      {/* CREATE */}
      {tab === 'create' && (
        <form onSubmit={handleCreate} className="px-5 py-6 space-y-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Title *</label>
            <input
              required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Canvass Carlisle Pike north side"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Brief / Description</label>
            <textarea
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Mission brief, instructions, context..."
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Assign To</label>
              <select
                value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Unassigned</option>
                {team.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Priority</label>
              <select
                value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as Assignment['priority'] }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Due Date</label>
            <input
              type="datetime-local" value={form.due_at} onChange={e => setForm(f => ({ ...f, due_at: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            type="submit" disabled={saving || !form.title.trim()}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold py-3 rounded-xl transition mt-2"
          >
            {saving ? 'Creating…' : 'Create Assignment'}
          </button>
        </form>
      )}

      {/* TEAM */}
      {tab === 'team' && (
        <div className="px-5 py-6 space-y-6">
          <form onSubmit={handleInvite} className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-sm">Add Team Member</h3>
            <input
              required type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
              placeholder="Email"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            <input
              required value={inviteName} onChange={e => setInviteName(e.target.value)}
              placeholder="Full name"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            <input
              value={inviteGroup} onChange={e => setInviteGroup(e.target.value)}
              placeholder="Group (A, B, C…)"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit" disabled={inviting}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white font-semibold py-3 rounded-xl transition"
            >
              {inviting ? 'Adding…' : 'Add Member'}
            </button>
          </form>

          {team.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-6">No team members yet.</p>
          ) : (
            <div className="space-y-2">
              <h3 className="text-xs text-gray-500 uppercase tracking-widest">Team ({team.length})</h3>
              {team.map(p => (
                <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{p.full_name}</p>
                    <p className="text-xs text-gray-500 capitalize">{p.role}{p.group_name ? ` · ${p.group_name}` : ''}</p>
                  </div>
                  <span className={`w-2 h-2 rounded-full ${p.is_active ? 'bg-green-400' : 'bg-gray-600'}`} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Nav role={profile!.role} />
    </main>
  )
}
