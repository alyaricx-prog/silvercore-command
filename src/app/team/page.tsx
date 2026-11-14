'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Nav from '@/components/Nav'
import AppHeader from '@/components/AppHeader'
import PageSkeleton from '@/components/Skeleton'
import type { Profile } from '@/lib/types'

type Tab = 'people' | 'feed'

export default function TeamPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [tab, setTab] = useState<Tab>('people')
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

  const tabs: { id: Tab; label: string }[] = [
    { id: 'people', label: 'People' },
    { id: 'feed',   label: 'Feed' },
  ]

  return (
    <main className="min-h-screen bg-base text-white">
      <AppHeader
        organisationId={profile.organisation_id}
        title="Team"
        subtitle="People · activity feed"
      />

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

      <div className="px-4 pt-6 pb-32 text-center text-dim text-sm">
        {tab === 'people' && <EmbedRedirect href="/customers" label="Loading People…" />}
        {tab === 'feed'   && <EmbedRedirect href="/feed"      label="Loading Feed…"   />}
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
      <p>{label}</p>
    </div>
  )
}
