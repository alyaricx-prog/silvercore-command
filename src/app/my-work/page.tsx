'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import PageSkeleton from '@/components/Skeleton'
import AssignmentCard from '@/components/AssignmentCard'
import QuickLogModal from '@/components/QuickLogModal'
import CheckInModal from '@/components/CheckInModal'
import type { Profile, Assignment, DealLog } from '@/lib/types'
import { sendPush } from '@/lib/sendPush'

export default function MyWorkPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [filter, setFilter] = useState<string>('open')
  const [loading, setLoading] = useState(true)
  const [logTarget, setLogTarget] = useState<string | null>(null)
  const [checkInTarget, setCheckInTarget] = useState<string | null>(null)
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

    // Notify the team on wins and losses — those are the moments worth a ping
    if (data.outcome === 'closed' || data.outcome === 'lost') {
      sendPush({
        organisation_id: profile.organisation_id,
        title: data.outcome === 'closed' ? '🎉 Deal Closed' : 'Deal Lost',
        body: `${profile.full_name}${data.notes ? ` — ${data.notes}` : ''}`,
        url: '/map',
      })
    }
  }

  async function handleCheckIn(data: { note: string; lat: number | null; lng: number | null }) {
    if (!profile || !checkInTarget) return
    const { error } = await supabase.from('check_ins').insert({
      organisation_id: profile.organisation_id,
      assignment_id: checkInTarget,
      employee_id: profile.id,
      note: data.note || null,
      lat: data.lat,
      lng: data.lng,
    })
    setCheckInTarget(null)
    if (error) {
      showToast('Check-in failed — try again')
    } else {
      // Auto-advance status to in_progress if still pending/acknowledged
      const target = assignments.find(a => a.id === checkInTarget)
      if (target && (target.status === 'pending' || target.status === 'acknowledged')) {
        handleStatusChange(checkInTarget, 'in_progress')
      }
      showToast('Checked in ✓')
    }
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const open = ['pending','acknowledged','in_progress']
  const filtered = filter === 'open'
    ? assignments.filter(a => open.includes(a.status))
    : assignments.filter(a => a.status === 'completed' || a.status === 'cancelled')

  if (loading) return <PageSkeleton variant="list" />

  return (
    <main className="sc-enter min-h-screen bg-page text-hi pb-24">
      <header className="px-5 pt-12 pb-4 border-b border-rim">
        <p className="text-xs text-dim uppercase tracking-widest mb-1">Field</p>
        <h1 className="text-xl font-bold">My Work</h1>
        {profile && <p className="text-xs text-dim mt-0.5">{profile.full_name}{profile.group_name ? ` · Group ${profile.group_name}` : ''}</p>}
      </header>

      {/* Filter toggle */}
      <div className="flex border-b border-rim">
        {[
          { key: 'open', label: `Open (${assignments.filter(a => open.includes(a.status)).length})` },
          { key: 'done', label: `Done (${assignments.filter(a => a.status === 'completed').length})` },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex-1 py-3 text-sm font-medium transition ${
              filter === f.key ? 'text-blue-400 border-b-2 border-blue-400' : 'text-dim'
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
            <p className="text-dim text-sm">
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
              onCheckIn={id => setCheckInTarget(id)}
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

      {checkInTarget && (
        <CheckInModal
          assignmentTitle={assignments.find(a => a.id === checkInTarget)?.title ?? ''}
          onSubmit={handleCheckIn}
          onClose={() => setCheckInTarget(null)}
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
