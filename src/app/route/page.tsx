'use client'
import { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import type { Profile, Assignment } from '@/lib/types'
import { useTheme } from '@/providers/ThemeProvider'

// We build a minimal map component inline since route planning has
// different concerns from the deal-log map (ordered numbered markers).
const RouteMap = dynamic(() => import('@/components/RouteMapView'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center rounded-2xl"
         style={{ background: 'var(--sc-well)', minHeight: 240 }}>
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
})

export default function RoutePage() {
  const [profile, setProfile]       = useState<Profile | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [selected, setSelected]     = useState<string[]>([])  // ordered list of assignment IDs
  const [loading, setLoading]       = useState(true)
  const [routeMode, setRouteMode]   = useState(false)
  const [currentStop, setCurrentStop] = useState(0)
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null)
  const { resolvedTheme }           = useTheme()

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!prof) { router.push('/auth/login'); return }
      setProfile(prof)

      // Employees see their own open assignments; hosts see all
      const isHost = prof.role === 'host' || prof.role === 'cohost'
      let q = supabase
        .from('assignments')
        .select('*')
        .eq('organisation_id', prof.organisation_id)
        .eq('status', 'open')
        .not('lat', 'is', null)
        .not('lng', 'is', null)
        .order('address')
      if (!isHost) {
        q = q.eq('assigned_to', prof.id)
      }
      const { data } = await q.limit(100)
      setAssignments(data || [])
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (!('geolocation' in navigator)) return
    const id = navigator.geolocation.watchPosition(
      pos => setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [])

  const toggleSelect = (id: string) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const moveStop = (index: number, dir: -1 | 1) => {
    setSelected(prev => {
      const next = [...prev]
      const swap = index + dir
      if (swap < 0 || swap >= next.length) return prev
      ;[next[index], next[swap]] = [next[swap], next[index]]
      return next
    })
  }

  const orderedStops = selected
    .map(id => assignments.find(a => a.id === id))
    .filter(Boolean) as Assignment[]

  const currentAssignment = routeMode ? orderedStops[currentStop] : null

  function openInMaps(a: Assignment) {
    if (!a.lat || !a.lng) return
    const url = `https://maps.apple.com/?daddr=${a.lat},${a.lng}`
      || `https://www.google.com/maps/dir/?api=1&destination=${a.lat},${a.lng}`
    // Prefer Apple Maps on iOS, Google Maps otherwise
    window.open(
      /iPhone|iPad|iPod/.test(navigator.userAgent)
        ? `maps://?daddr=${a.lat},${a.lng}`
        : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(a.address ?? '')}`,
      '_blank',
    )
  }

  if (loading) return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--sc-page)' }}>
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  // ── Route mode (step-by-step) ──────────────────────────────────
  if (routeMode && currentAssignment) {
    const isLast = currentStop === orderedStops.length - 1
    return (
      <main className="min-h-screen flex flex-col pb-20" style={{ background: 'var(--sc-page)', color: 'var(--sc-hi)' }}>
        {/* Map fills top half */}
        <div className="h-56 relative">
          <RouteMap
            stops={orderedStops}
            currentStop={currentStop}
            myLocation={myLocation}
            theme={resolvedTheme}
          />
          <button
            onClick={() => setRouteMode(false)}
            className="absolute top-3 left-3 z-20 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-lg"
            style={{ background: 'var(--sc-card)', color: 'var(--sc-hi)', border: '1px solid var(--sc-rim)' }}>
            ← Exit Route
          </button>
        </div>

        <div className="flex-1 px-4 pt-4">
          {/* Progress */}
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 scrollbar-none">
            {orderedStops.map((_, i) => (
              <div key={i}
                className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all"
                style={i === currentStop
                  ? { background: 'var(--sc-blue,#3b82f6)', borderColor: 'var(--sc-blue,#3b82f6)', color: '#fff' }
                  : i < currentStop
                  ? { background: '#22c55e', borderColor: '#22c55e', color: '#fff' }
                  : { background: 'var(--sc-well)', borderColor: 'var(--sc-rim)', color: 'var(--sc-dim)' }
                }>
                {i < currentStop ? '✓' : i + 1}
              </div>
            ))}
          </div>

          {/* Current stop card */}
          <div className="rounded-2xl border border-rim p-5 mb-4 sc-enter"
               style={{ background: 'var(--sc-card)' }}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-xs text-dim uppercase tracking-widest font-medium mb-1">
                  Stop {currentStop + 1} of {orderedStops.length}
                </p>
                <p className="font-bold text-lg leading-tight">{currentAssignment.address}</p>
                {currentAssignment.group_name && (
                  <p className="text-sm text-dim mt-0.5">{currentAssignment.group_name}</p>
                )}
              </div>
              <span className="text-3xl">📍</span>
            </div>
            {currentAssignment.notes && (
              <p className="text-sm text-lo mb-3 p-3 rounded-xl" style={{ background: 'var(--sc-well)' }}>
                {currentAssignment.notes}
              </p>
            )}
            <button
              onClick={() => openInMaps(currentAssignment)}
              className="w-full py-3 rounded-xl bg-blue-500 text-white font-semibold text-sm flex items-center justify-center gap-2"
            >
              <span>🧭</span> Navigate Here
            </button>
          </div>

          {/* Next/Done */}
          <button
            onClick={() => {
              if (isLast) { setRouteMode(false); setCurrentStop(0) }
              else setCurrentStop(s => s + 1)
            }}
            className="w-full py-3 rounded-xl font-semibold text-sm"
            style={isLast
              ? { background: '#22c55e', color: '#fff' }
              : { background: 'var(--sc-well)', color: 'var(--sc-hi)', border: '1px solid var(--sc-rim)' }
            }
          >
            {isLast ? '✅ Finish Route' : `Next Stop →`}
          </button>
        </div>

        <Nav role={profile!.role} />
      </main>
    )
  }

  // ── Planning mode (pick & order stops) ────────────────────────
  return (
    <main className="min-h-screen pb-20" style={{ background: 'var(--sc-page)', color: 'var(--sc-hi)' }}>
      <div className="max-w-lg mx-auto px-4 pt-14">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold">Route Planner</h1>
            <p className="text-xs text-dim mt-0.5">
              {assignments.length} stop{assignments.length !== 1 ? 's' : ''} with GPS · {selected.length} selected
            </p>
          </div>
          {selected.length > 0 && (
            <button
              onClick={() => { setCurrentStop(0); setRouteMode(true) }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-semibold"
            >
              🧭 Start Route
            </button>
          )}
        </div>

        {/* Mini map preview */}
        {selected.length > 0 && (
          <div className="rounded-2xl overflow-hidden border border-rim mb-5" style={{ height: 200 }}>
            <RouteMap
              stops={orderedStops}
              currentStop={-1}
              myLocation={myLocation}
              theme={resolvedTheme}
            />
          </div>
        )}

        {/* Selected stops (ordered) */}
        {selected.length > 0 && (
          <div className="mb-5">
            <h2 className="text-xs font-semibold text-dim uppercase tracking-widest mb-2">Your Route</h2>
            <div className="space-y-2">
              {orderedStops.map((a, i) => (
                <div key={a.id}
                     className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-3 flex items-center gap-3 sc-enter">
                  <span className="w-7 h-7 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{a.address}</p>
                    {a.group_name && <p className="text-xs text-dim">{a.group_name}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => moveStop(i, -1)} disabled={i === 0}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-dim disabled:opacity-30"
                      style={{ background: 'var(--sc-well)' }}>↑</button>
                    <button onClick={() => moveStop(i, 1)} disabled={i === orderedStops.length - 1}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-dim disabled:opacity-30"
                      style={{ background: 'var(--sc-well)' }}>↓</button>
                    <button onClick={() => toggleSelect(a.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400"
                      style={{ background: 'var(--sc-well)' }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All available stops */}
        <div>
          <h2 className="text-xs font-semibold text-dim uppercase tracking-widest mb-2">
            {selected.length > 0 ? 'Add More Stops' : 'Available Stops'}
          </h2>

          {assignments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">🗺️</p>
              <p className="font-semibold text-sm">No GPS-pinned assignments</p>
              <p className="text-xs text-dim mt-1">Assignments need lat/lng coordinates to appear here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {assignments
                .filter(a => !selected.includes(a.id))
                .map(a => (
                  <button
                    key={a.id}
                    onClick={() => toggleSelect(a.id)}
                    className="w-full rounded-2xl border border-rim p-3 flex items-center gap-3 text-left transition-all hover:border-blue-500/50 sc-enter"
                    style={{ background: 'var(--sc-card)' }}
                  >
                    <span className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs"
                          style={{ background: 'var(--sc-well)', color: 'var(--sc-dim)' }}>+</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{a.address}</p>
                      <div className="flex items-center gap-2 text-xs text-dim mt-0.5">
                        {a.group_name && <span>{a.group_name}</span>}
                        {a.notes && <span className="truncate">· {a.notes.substring(0, 40)}</span>}
                      </div>
                    </div>
                    <span className="text-blue-400 text-xs shrink-0">Add</span>
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>
      <Nav role={profile!.role} />
    </main>
  )
}
