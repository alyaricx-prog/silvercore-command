'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import AssignmentCard from '@/components/AssignmentCard'
import QuickLogModal from '@/components/QuickLogModal'
import type { Profile, Assignment, DealLog } from '@/lib/types'

export default function MyWorkPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [filter, setFilter] = useState<string>('open')
  const [loading, setLoading] = useState(true)
  const [logTarget, setLogTarget] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!prof) { router.push('/auth/login'); return }
      setProfile(prof)

      const { data: a } = await supabase
        .from('assignments').select('*')
        .eq('assigned_to', user.id)
        .order('created_at', { ascending: false })
      setAssignments(a || [])
      setLoading(false)
    }
    load()
  }, [])

  async function handleStatusChange(id: string, status: Assignment['status']) {
    const { error } = await supabase
      .from('assignments')
      .update({ status, ...(status === 'completed' ? { completed_at: new Date().toISOString() } : {}) })
      .eq('id', id)
    if (!error) setAssignments(prev => prev.map(a => a.id === id ? { ...a, status } : a))
  }

  async function handleLogDeal(data: { outcome: DealLog['outcome']; notes: string; lat: number | null; lng: number | null }) {
    if (!profile || !logTarget) return
    await supabase.from('deal_logs').insert({
      organisation_id: profile.organisation_id,
      assignment_id: logTarget,
      logged_by: profile.id,
      outcome: data.outcome,
      notes: data.notes || null,
      lat: data.lat,
      lng: data.lng,
    })
    setLogTarget(null)
    showToast('Deal logged ✓')
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const open = ['pending','acknowledged','in_progress']
  const filtered = filter === 'open'
    ? assignments.filter(a => open.includes(a.status))
    : assignments.filter(a => a.status === 'completed' || a.status === 'cancelled')

  if (loading) return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  return (
    <main className="min-h-screen bg-gray-950 text-white pb-24">
      <header className="px-5 pt-12 pb-4 border-b border-gray-800">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Field</p>
        <h1 className="text-xl font-bold">My Work</h1>
        {profile && <p className="text-xs text-gray-500 mt-0.5">{profile.full_name}{profile.group_name ? ` · Group ${profile.group_name}` : ''}</p>}
      </header>

      {/* Filter toggle */}
      <div className="flex border-b border-gray-800">
        {[
          { key: 'open', label: `Open (${assignments.filter(a => open.includes(a.status)).length})` },
          { key: 'done', label: `Done (${assignments.filter(a => a.status === 'completed').length})` },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex-1 py-3 text-sm font-medium transition ${
              filter === f.key ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="px-5 py-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">{filter === 'open' ? '🎯' : '✅'}</p>
            <p className="text-gray-500 text-sm">
              {filter === 'open' ? 'No open assignments.' : 'No completed assignments yet.'}
            </p>
          </div>
        ) : (
          filtered.map(a => (
            <AssignmentCard
              key={a.id}
              assignment={a}
              assignee={profile}
              onStatusChange={handleStatusChange}
              onLogDeal={id => setLogTarget(id)}
              isEmployee={true}
            />
          ))
        )}
      </div>

      {logTarget && profile && (
        <QuickLogModal
          assignmentId={logTarget}
          onSubmit={handleLogDeal}
          onClose={() => setLogTarget(null)}
        />
      )}

      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-green-700 text-white text-sm px-5 py-2.5 rounded-full shadow-lg z-50 transition">
          {toast}
        </div>
      )}

      <Nav role={profile!.role} />
    </main>
  )
}
