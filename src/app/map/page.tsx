'use client'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import type { Profile, DealLog } from '@/lib/types'

const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-gray-900">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Loading map…</p>
      </div>
    </div>
  ),
})

const LEGEND = [
  { outcome: 'closed',     color: 'bg-green-500',  label: 'Closed' },
  { outcome: 'lost',       color: 'bg-red-500',    label: 'Lost' },
  { outcome: 'follow_up',  color: 'bg-yellow-500', label: 'Follow Up' },
  { outcome: 'no_contact', color: 'bg-gray-500',   label: 'No Contact' },
]

export default function MapPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [logs, setLogs] = useState<DealLog[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!prof) { router.push('/auth/login'); return }
      setProfile(prof)

      const [{ data: l }, { data: p }] = await Promise.all([
        supabase.from('deal_logs').select('*').eq('organisation_id', prof.organisation_id).order('created_at', { ascending: false }).limit(500),
        supabase.from('profiles').select('*').eq('organisation_id', prof.organisation_id),
      ])
      setLogs(l || [])
      setProfiles(p || [])
      setLoading(false)
    }
    load()
  }, [])

  const counts = LEGEND.map(l => ({
    ...l,
    count: logs.filter(d => d.outcome === l.outcome).length,
  }))

  if (loading) return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  return (
    <main className="h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <header className="px-5 pt-12 pb-3 border-b border-gray-800 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-0.5">Live</p>
            <h1 className="text-xl font-bold">Deal Map</h1>
          </div>
          <span className="text-xs text-gray-500">{logs.filter(l => l.lat && l.lng).length} pins</span>
        </div>
        {/* Legend */}
        <div className="flex gap-3 mt-3 overflow-x-auto">
          {counts.map(l => (
            <div key={l.outcome} className="flex items-center gap-1.5 shrink-0">
              <span className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
              <span className="text-xs text-gray-400">{l.label} <span className="text-white font-medium">{l.count}</span></span>
            </div>
          ))}
        </div>
      </header>

      {/* Map fills remaining height */}
      <div className="flex-1 relative pb-16">
        <MapView logs={logs} profiles={profiles} />
        {logs.filter(l => l.lat && l.lng).length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center bg-gray-900/80 rounded-2xl px-8 py-6 backdrop-blur">
              <p className="text-3xl mb-2">📍</p>
              <p className="text-gray-400 text-sm">No logged locations yet.</p>
              <p className="text-gray-500 text-xs mt-1">Employees pin their location when logging a deal.</p>
            </div>
          </div>
        )}
      </div>

      <Nav role={profile!.role} />
    </main>
  )
}
