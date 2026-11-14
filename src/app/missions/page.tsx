'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Nav from '@/components/Nav'
import AppHeader from '@/components/AppHeader'
import PageSkeleton from '@/components/Skeleton'
import type { Profile } from '@/lib/types'

type Tab = 'assign' | 'goals' | 'sim'

export default function MissionsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [tab, setTab] = useState<Tab>('assign')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!prof) { router.push('/onboard'); return }
      setProfile(prof)
      setLoading(false)
    }
    load()
  }, [])

  if (loading || !profile) return <PageSkeleton />

  const isHost = profile.role === 'host' || profile.role === 'cohost'

  // Employees go straight to My Work
  if (!isHost) {
    router.replace('/my-work')
    return null
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'assign', label: 'Assign' },
    { id: 'goals',  label: 'Goals' },
    { id: 'sim',    label: 'Simulation' },
  ]

  return (
    <main className="min-h-screen bg-base text-white">
      <AppHeader
        organisationId={profile.organisation_id}
        title="Missions"
        subtitle="Assign · track · simulate"
      />

      {/* Tab switcher */}
      <div className="px-4 pt-4">
        <div className="flex gap-2 p-1 rounded-2xl" style={{ background: 'var(--sc-card,#111827)' }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 py-2 text-sm font-bold rounded-xl transition-all"
              style={tab === t.id
                ? { background: 'var(--sc-brand)', color: '#fff' }
                : { color: 'var(--sc-dim)' }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Embedded section — full-page redirect for now keeps things simple */}
      <div className="px-4 pt-6 pb-32 text-center text-dim text-sm">
        {tab === 'assign' && (
          <EmbedRedirect href="/assignments" label="Open Assignments" />
        )}
        {tab === 'goals' && (
          <EmbedRedirect href="/goals" label="Open Goals" />
        )}
        {tab === 'sim' && (
          <EmbedRedirect href="/simulation" label="Open Simulation" />
        )}
      </div>

      <Nav role={profile.role} />
    </main>
  )
}

function EmbedRedirect({ href, label }: { href: string; label: string }) {
  const router = useRouter()
  useEffect(() => { router.push(href) }, [href])
  return (
    <div className="mt-10 flex flex-col items-center gap-4 opacity-60">
      <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin" />
      <p>{label}…</p>
    </div>
  )
}
