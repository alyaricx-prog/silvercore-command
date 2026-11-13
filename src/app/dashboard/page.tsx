'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import PageSkeleton from '@/components/Skeleton'
import type { Profile, Assignment } from '@/lib/types'

export default function DashboardPage() {
  const [profile,     setProfile]     = useState<Profile | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading,     setLoading]     = useState(true)
  const router  = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: prof } = await supabase
        .from('profiles').select('*').eq('id', user.id).single()
      if (!prof) { router.push('/onboard'); return }

      // Employee first-login: send to their onboarding wizard
      if (!prof.onboarded && prof.role === 'employee') {
        router.push('/onboard/employee'); return
      }

      setProfile(prof)

      const isHost = prof.role === 'host' || prof.role === 'cohost'
      const q = supabase.from('assignments').select('*')
        .eq('organisation_id', prof.organisation_id)
      const { data: a } = isHost
        ? await q.neq('status', 'cancelled').order('created_at', { ascending: false }).limit(50)
        : await q.eq('assigned_to', user.id).neq('status', 'cancelled').order('created_at', { ascending: false }).limit(20)

      setAssignments(a || [])
      setLoading(false)
    }
    load()
  }, [])

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
    <main className="sc-enter min-h-screen bg-page text-hi pb-20">
      {/* Header */}
      <header className="px-5 pt-12 pb-6">
        <p className="text-xs text-dim uppercase tracking-widest mb-1">SilverCore Command</p>
        <h1 className="text-2xl font-bold">{greeting()},</h1>
        <p className="text-xl text-blue-400 font-semibold">{profile.full_name.split(' ')[0]}</p>
        <p className="text-xs text-dim mt-1 capitalize">
          {profile.role}{profile.group_name ? ` · ${profile.group_name}` : ''}
        </p>
      </header>

      <div className="px-5 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Pending',   value: pending,    color: 'text-hi' },
            { label: 'Active',    value: inProgress, color: 'text-blue-400' },
            { label: 'Completed', value: completed,  color: 'text-green-400' },
          ].map(s => (
            <div key={s.label} className="bg-card rounded-xl p-4 text-center border border-rim">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-dim mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Quick links */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-dim uppercase tracking-widest">Quick Access</h2>
          {isHost ? (
            <>
              <QuickLink
                href="/assignments"
                title="Assignments"
                subtitle={`${pending} pending · ${inProgress} active`}
                icon="📋"
              />
              <QuickLink href="/map" title="Deal Map" subtitle="Live field activity" icon="🗺" />
            </>
          ) : (
            <>
              <QuickLink
                href="/my-work"
                title="My Work"
                subtitle={`${pending + inProgress} open assignments`}
                icon="💼"
              />
              <QuickLink href="/map" title="Deal Map" subtitle="Team activity" icon="🗺" />
            </>
          )}
        </div>

        {/* Empty state */}
        {assignments.length === 0 && (
          <div className="bg-card border border-dashed border-rim2 rounded-xl px-5 py-8 text-center">
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

        {/* Recent */}
        {assignments.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-xs font-semibold text-dim uppercase tracking-widest">Recent</h2>
            {assignments.slice(0, 3).map(a => (
              <div
                key={a.id}
                className="bg-card border border-rim rounded-xl px-4 py-3 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-hi">{a.title}</p>
                  <p className="text-xs text-dim mt-0.5 capitalize">{a.status.replace('_', ' ')}</p>
                </div>
                <span className={`w-2 h-2 rounded-full ${
                  a.status === 'completed'  ? 'bg-green-400' :
                  a.status === 'in_progress' ? 'bg-blue-400' :
                  a.status === 'acknowledged'? 'bg-purple-400' : 'bg-gray-600'
                }`} />
              </div>
            ))}
          </div>
        )}
      </div>

      <Nav role={profile.role} />
    </main>
  )
}

function QuickLink({ href, title, subtitle, icon }: {
  href: string; title: string; subtitle: string; icon: string
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-4 bg-card border border-rim hover:border-rim2 rounded-xl px-4 py-4 transition group"
    >
      <span className="text-2xl">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-hi">{title}</p>
        <p className="text-xs text-dim">{subtitle}</p>
      </div>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
        className="w-4 h-4 text-dim group-hover:text-lo transition shrink-0">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </a>
  )
}
