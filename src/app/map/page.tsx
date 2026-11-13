'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import type { Profile, DealLog, LocationNote, FrictionReport, TrainingNote } from '@/lib/types'
import { OUTCOME_COLORS, OUTCOME_LABELS } from '@/components/MapView'
import { useTheme } from '@/providers/ThemeProvider'

const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--sc-page)' }}>
      <div className="text-center">
        <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-dim text-sm">Loading map…</p>
      </div>
    </div>
  ),
})

const FILTERS = [
  { outcome: null,          label: 'All' },
  { outcome: 'closed',      label: 'Closed' },
  { outcome: 'follow_up',   label: 'Follow Up' },
  { outcome: 'lost',        label: 'Lost' },
  { outcome: 'no_contact',  label: 'No Contact' },
]

type FeedItem = {
  id: string
  outcome: string
  notes: string
  created_at: string
  rep?: string
  group?: string
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ── EditLogForm ──────────────────────────────────────────────
const OUTCOMES: DealLog['outcome'][] = ['closed', 'lost', 'follow_up', 'no_contact']
const OUTCOME_LABELS_EDIT: Record<DealLog['outcome'], string> = {
  closed: '✅ Closed', lost: '❌ Lost', follow_up: '🔁 Follow Up', no_contact: '🚫 No Contact',
}

function EditLogForm({ log, saving, onSave, onDelete, onCancel }: {
  log: DealLog
  saving: boolean
  onSave: (outcome: DealLog['outcome'], notes: string) => void
  onDelete: () => void
  onCancel: () => void
}) {
  const [outcome, setOutcome] = useState<DealLog['outcome']>(log.outcome)
  const [notes, setNotes] = useState(log.notes || '')

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-dim uppercase tracking-widest block mb-2">Outcome</label>
        <div className="grid grid-cols-2 gap-2">
          {OUTCOMES.map(o => (
            <button key={o} onClick={() => setOutcome(o)}
              className="rounded-xl py-2.5 text-sm font-medium transition-all border"
              style={{
                background: outcome === o ? 'var(--sc-well)' : 'transparent',
                borderColor: outcome === o ? 'rgba(255,255,255,0.2)' : 'var(--sc-rim)',
                color: outcome === o ? 'var(--sc-hi)' : 'var(--sc-dim)',
              }}>
              {OUTCOME_LABELS_EDIT[o]}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-dim uppercase tracking-widest block mb-2">Notes</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-xl px-3 py-2.5 text-sm border outline-none resize-none"
          style={{ background: 'var(--sc-well)', borderColor: 'var(--sc-rim)', color: 'var(--sc-hi)' }}
          placeholder="Add context…"
        />
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={() => onSave(outcome, notes)} disabled={saving}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-50"
          style={{ background: 'var(--sc-blue)' }}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <button onClick={onDelete}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors">
          Delete
        </button>
      </div>
    </div>
  )
}

export default function MapPage() {
  const [profile, setProfile]   = useState<Profile | null>(null)
  const [logs, setLogs]         = useState<DealLog[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading]   = useState(true)
  const [active, setActive]     = useState<string | null>(null)
  const [newIds, setNewIds]     = useState<Set<string>>(new Set())
  const [liveCount, setLiveCount] = useState(0)        // new pins since page load
  const [sheetOpen, setSheetOpen] = useState(false)   // bottom feed
  const [flash, setFlash]       = useState<FeedItem | null>(null)  // toast
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationDenied, setLocationDenied] = useState(false)
  const profileRef              = useRef<Record<string, Profile>>({})
  const orgIdRef                = useRef<string | null>(null)
  const router = useRouter()
  const supabase = createClient()
  const { resolvedTheme } = useTheme()

  // ── Request live location (this is what triggers the browser's permission prompt) ──
  useEffect(() => {
    if (!('geolocation' in navigator)) { setLocationDenied(true); return }

    const watchId = navigator.geolocation.watchPosition(
      pos => {
        setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocationDenied(false)
      },
      err => {
        console.warn('Geolocation error:', err.message)
        setLocationDenied(true)
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  // ── Initial load ──────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!prof) { router.push('/auth/login'); return }
      setProfile(prof)
      orgIdRef.current = prof.organisation_id

      const [{ data: l }, { data: p }] = await Promise.all([
        supabase.from('deal_logs').select('*').eq('organisation_id', prof.organisation_id)
          .order('created_at', { ascending: false }).limit(500),
        supabase.from('profiles').select('*').eq('organisation_id', prof.organisation_id),
      ])
      const profilesList = p || []
      setLogs(l || [])
      setProfiles(profilesList)
      profileRef.current = Object.fromEntries(profilesList.map(p => [p.id, p]))
      setLoading(false)
    }
    load()
  }, [])

  // ── Real-time subscription ────────────────────────────────────
  useEffect(() => {
    if (loading) return
    if (!orgIdRef.current) return

    const channel = supabase
      .channel('map-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'deal_logs',
        filter: `organisation_id=eq.${orgIdRef.current}`,
      }, (payload) => {
        const newLog = payload.new as DealLog
        setLogs(prev => [newLog, ...prev])
        if (newLog.lat && newLog.lng) {
          // Track new pin for pulse animation
          setNewIds(prev => new Set([...prev, newLog.id]))
          setLiveCount(c => c + 1)
          // Clear pulse after 5s
          setTimeout(() => setNewIds(prev => {
            const next = new Set(prev); next.delete(newLog.id); return next
          }), 5000)
          // Flash toast
          const rep = profileRef.current[newLog.logged_by]
          setFlash({
            id: newLog.id,
            outcome: newLog.outcome,
            notes: newLog.notes,
            created_at: newLog.created_at,
            rep: rep?.full_name,
            group: rep?.group_name,
          })
          setTimeout(() => setFlash(null), 4000)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [loading])

  const [editLog, setEditLog]       = useState<DealLog | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [locNotes, setLocNotes]     = useState<LocationNote[]>([])
  const [frictions, setFrictions]   = useState<FrictionReport[]>([])
  const [trainingNotes, setTrainingNotes] = useState<TrainingNote[]>([])
  const [showLocNoteForm, setShowLocNoteForm] = useState(false)
  const [locNoteText, setLocNoteText]         = useState('')
  const [showFrictionForm, setShowFrictionForm] = useState(false)
  const [frictionCat, setFrictionCat]           = useState<FrictionReport['category']>('other')
  const [frictionNote, setFrictionNote]         = useState('')

  // Load location notes, friction reports, training notes
  useEffect(() => {
    if (!orgIdRef.current) return
    async function loadExtra() {
      const [{ data: ln }, { data: fr }, { data: tn }] = await Promise.all([
        supabase.from('location_notes').select('*').eq('organisation_id', orgIdRef.current!),
        supabase.from('friction_reports').select('*').eq('organisation_id', orgIdRef.current!).eq('resolved', false),
        supabase.from('training_notes').select('*').eq('organisation_id', orgIdRef.current!),
      ])
      setLocNotes(ln || [])
      setFrictions(fr || [])
      setTrainingNotes(tn || [])
    }
    if (!loading) loadExtra()
  }, [loading])

  async function saveEdit(outcome: DealLog['outcome'], notes: string) {
    if (!editLog) return
    setEditSaving(true)
    await supabase.from('deal_logs').update({ outcome, notes }).eq('id', editLog.id)
    setLogs(prev => prev.map(l => l.id === editLog.id ? { ...l, outcome, notes } : l))
    setEditLog(null)
    setEditSaving(false)
  }

  async function deleteLog(id: string) {
    if (!confirm('Delete this deal log? This cannot be undone.')) return
    await supabase.from('deal_logs').delete().eq('id', id)
    setLogs(prev => prev.filter(l => l.id !== id))
  }

  async function saveLocationNote() {
    if (!profile || !myLocation || !locNoteText.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('location_notes').insert({
      organisation_id: profile.organisation_id,
      created_by: user.id,
      lat: myLocation.lat,
      lng: myLocation.lng,
      note: locNoteText.trim(),
    }).select().single()
    if (data) setLocNotes(prev => [data, ...prev])
    setLocNoteText(''); setShowLocNoteForm(false)
  }

  async function saveFrictionReport() {
    if (!profile || !myLocation) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('friction_reports').insert({
      organisation_id: profile.organisation_id,
      reported_by: user.id,
      lat: myLocation.lat,
      lng: myLocation.lng,
      category: frictionCat,
      note: frictionNote.trim() || null,
    }).select().single()
    if (data) setFrictions(prev => [data, ...prev])
    setFrictionNote(''); setShowFrictionForm(false)
  }

  const pinned  = logs.filter(l => l.lat && l.lng)
  const feed    = pinned.slice(0, 30)   // most recent 30 for the sheet

  const countFor = (outcome: string | null) =>
    outcome ? pinned.filter(l => l.outcome === outcome).length : pinned.length

  if (loading) return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--sc-page)' }}>
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  return (
    <main className="sc-enter h-screen flex flex-col overflow-hidden" style={{ background: 'var(--sc-page)', color: 'var(--sc-hi)' }}>

      {/* ── Floating header ──────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
        <div className="pointer-events-auto px-4 pt-12 pb-3">

          {/* Title row */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-dim uppercase tracking-widest font-medium">Live</span>
              {liveCount > 0 && (
                <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  +{liveCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {locationDenied && (
                <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-1 rounded-full">
                  Location off
                </span>
              )}
              <span className="text-sm font-bold" style={{ color: 'var(--sc-hi)' }}>{pinned.length} pins</span>
            </div>
          </div>

          {/* Filter chips */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {FILTERS.map(f => {
              const isActive = active === f.outcome
              const color = f.outcome ? OUTCOME_COLORS[f.outcome] : '#6b7280'
              return (
                <button
                  key={String(f.outcome)}
                  onClick={() => setActive(f.outcome)}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-sm transition-all"
                  style={isActive ? {
                    background: `${color}25`,
                    border: `1px solid ${color}70`,
                    color: color,
                    boxShadow: `0 0 12px ${color}30`,
                  } : {
                    background: 'rgba(17,24,39,0.75)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'var(--sc-lo)',
                  }}
                >
                  {f.outcome && (
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: isActive ? color : 'var(--sc-dim)' }} />
                  )}
                  {f.label}
                  <span style={{ color: isActive ? color : 'var(--sc-hi)', opacity: isActive ? 1 : 0.6, fontWeight: 700 }}>
                    {countFor(f.outcome)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Map (full screen) ─────────────────────────────────────── */}
      <div className="absolute inset-0 z-0">
        <MapView logs={logs} profiles={profiles} activeFilter={active} theme={resolvedTheme} newIds={newIds} myLocation={myLocation} />
      </div>

      {/* ── Empty state ───────────────────────────────────────────── */}
      {pinned.length === 0 && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className="text-center rounded-2xl px-8 py-6 backdrop-blur border border-rim/40 shadow-xl"
               style={{ background: 'rgba(17,24,39,0.85)' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3"
                 style={{ background: 'var(--sc-well)' }}>
              <span className="text-xl">📍</span>
            </div>
            <p className="text-hi font-semibold text-sm">No locations yet</p>
            <p className="text-dim text-xs mt-1">Employees pin their location when logging a deal.</p>
          </div>
        </div>
      )}

      {/* ── Live flash toast (new pin) ────────────────────────────── */}
      {flash && (
        <div
          className="absolute left-4 right-4 z-30 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-2xl sc-enter"
          style={{
            bottom: 90,
            background: 'rgba(17,24,39,0.95)',
            border: `1px solid ${OUTCOME_COLORS[flash.outcome]}50`,
            backdropFilter: 'blur(12px)',
          }}
        >
          <span className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse"
                style={{ background: OUTCOME_COLORS[flash.outcome] }} />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold truncate" style={{ color: OUTCOME_COLORS[flash.outcome] }}>
              {OUTCOME_LABELS[flash.outcome]}
              {flash.rep && <span className="text-lo font-normal ml-1.5">· {flash.rep}</span>}
            </div>
            {flash.notes && <div className="text-xs text-dim truncate mt-0.5">{flash.notes}</div>}
          </div>
          <span className="text-xs text-dim shrink-0">just now</span>
        </div>
      )}

      {/* ── Bottom activity sheet ─────────────────────────────────── */}
      <div
        className="absolute left-0 right-0 z-20 transition-all duration-300"
        style={{
          bottom: 64,
          transform: sheetOpen ? 'translateY(0)' : 'translateY(calc(100% - 52px))',
        }}
      >
        {/* Handle / collapse button */}
        <button
          onClick={() => setSheetOpen(o => !o)}
          className="w-full flex items-center justify-between px-5 py-3 rounded-t-2xl"
          style={{
            background: 'rgba(17,24,39,0.96)',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            borderLeft: '1px solid rgba(255,255,255,0.08)',
            borderRight: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs font-semibold text-hi">Activity Feed</span>
            <span className="text-xs text-dim">· {feed.length} recent</span>
          </div>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
               className="text-dim transition-transform duration-300"
               style={{ transform: sheetOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            <path d="M4 10l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Feed list */}
        <div
          className="overflow-y-auto scrollbar-none"
          style={{
            maxHeight: 300,
            background: 'rgba(17,24,39,0.96)',
            backdropFilter: 'blur(16px)',
          }}
        >
          {feed.length === 0 ? (
            <p className="text-center text-dim text-xs py-6">No logged locations yet.</p>
          ) : feed.map((log, i) => {
            const rep = profileRef.current[log.logged_by]
            const color = OUTCOME_COLORS[log.outcome]
            return (
              <div key={log.id}
                   className="flex items-center gap-3 px-5 py-3"
                   style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="font-semibold truncate" style={{ color }}>{OUTCOME_LABELS[log.outcome]}</span>
                    {rep && <span className="text-lo truncate">· {rep.full_name}</span>}
                    {rep?.group_name && <span className="text-dim text-xs truncate">({rep.group_name})</span>}
                  </div>
                  {log.notes && <p className="text-xs text-dim truncate mt-0.5">{log.notes}</p>}
                </div>
                <span className="text-xs text-dim shrink-0 ml-2">{timeAgo(log.created_at)}</span>
                {profile?.role !== 'employee' && (
                  <button
                    onClick={() => setEditLog(log)}
                    className="shrink-0 text-xs text-dim hover:text-blue-400 transition-colors px-1"
                    title="Edit"
                  >✏️</button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <Nav role={profile!.role} />

      {/* ── Location Note + Friction Report buttons ──────────── */}
      <div className="fixed z-30 flex gap-2" style={{ bottom: 80, right: 16 }}>
        <button onClick={() => { setShowLocNoteForm(v => !v); setShowFrictionForm(false) }}
          className="px-3 py-2 rounded-xl text-xs font-semibold shadow-lg transition"
          style={{ background: 'var(--sc-card)', color: 'var(--sc-hi)', border: '1px solid var(--sc-rim)' }}>
          📍 Note
        </button>
        <button onClick={() => { setShowFrictionForm(v => !v); setShowLocNoteForm(false) }}
          className="px-3 py-2 rounded-xl text-xs font-semibold shadow-lg transition"
          style={{ background: 'var(--sc-card)', color: 'var(--sc-hi)', border: '1px solid var(--sc-rim)' }}>
          ⚠️ Flag
        </button>
      </div>

      {/* ── Location Note Form ────────────────────────────────── */}
      {showLocNoteForm && (
        <div className="fixed z-40 inset-x-4 rounded-2xl p-4 shadow-2xl"
             style={{ bottom: 130, background: 'var(--sc-card)', border: '1px solid var(--sc-rim)' }}>
          <p className="text-xs font-semibold text-hi mb-2">📍 Add location note</p>
          <p className="text-xs text-dim mb-2">Visible to your whole team for this location.</p>
          <textarea value={locNoteText} onChange={e => setLocNoteText(e.target.value)}
            placeholder="e.g. Dog in yard, Spanish speaker, call after 5pm…"
            rows={2} className="w-full bg-well border border-rim rounded-lg px-3 py-2 text-sm text-hi placeholder-dim resize-none mb-3" />
          <div className="flex gap-2">
            <button onClick={() => setShowLocNoteForm(false)}
              className="flex-1 py-2 rounded-xl text-xs font-semibold text-dim border border-rim">Cancel</button>
            <button onClick={saveLocationNote} disabled={!locNoteText.trim() || !myLocation}
              className="flex-1 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 disabled:opacity-40">Save Note</button>
          </div>
          {!myLocation && <p className="text-xs text-red-400 mt-2 text-center">Enable location to pin a note</p>}
        </div>
      )}

      {/* ── Friction Report Form ──────────────────────────────── */}
      {showFrictionForm && (
        <div className="fixed z-40 inset-x-4 rounded-2xl p-4 shadow-2xl"
             style={{ bottom: 130, background: 'var(--sc-card)', border: '1px solid var(--sc-rim)' }}>
          <p className="text-xs font-semibold text-hi mb-3">⚠️ Flag this location</p>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {(['hoa','dangerous','competitor','no_soliciting','other'] as FrictionReport['category'][]).map(c => (
              <button key={c} onClick={() => setFrictionCat(c)}
                className={`py-2 rounded-lg text-xs font-semibold transition border ${frictionCat === c ? 'bg-red-900/40 border-red-500 text-red-300' : 'border-rim text-dim'}`}>
                {c === 'hoa' ? 'HOA' : c === 'no_soliciting' ? 'No Solicit' : c.charAt(0).toUpperCase() + c.slice(1)}
              </button>
            ))}
          </div>
          <textarea value={frictionNote} onChange={e => setFrictionNote(e.target.value)}
            placeholder="Details (optional)"
            rows={2} className="w-full bg-well border border-rim rounded-lg px-3 py-2 text-sm text-hi placeholder-dim resize-none mb-3" />
          <div className="flex gap-2">
            <button onClick={() => setShowFrictionForm(false)}
              className="flex-1 py-2 rounded-xl text-xs font-semibold text-dim border border-rim">Cancel</button>
            <button onClick={saveFrictionReport} disabled={!myLocation}
              className="flex-1 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 disabled:opacity-40">Report</button>
          </div>
          {!myLocation && <p className="text-xs text-red-400 mt-2 text-center">Enable location to flag</p>}
        </div>
      )}

      {/* ── Location notes & friction count badge ─────────────── */}
      {(locNotes.length > 0 || frictions.length > 0) && (
        <div className="fixed z-30 flex gap-2 text-xs" style={{ top: 120, right: 12 }}>
          {locNotes.length > 0 && (
            <div className="px-2 py-1 rounded-lg font-semibold"
                 style={{ background: 'var(--sc-card)', border: '1px solid var(--sc-rim)', color: 'var(--sc-dim)' }}>
              📍 {locNotes.length}
            </div>
          )}
          {frictions.length > 0 && (
            <div className="px-2 py-1 rounded-lg font-semibold text-red-400"
                 style={{ background: 'var(--sc-card)', border: '1px solid rgba(239,68,68,0.3)' }}>
              ⚠️ {frictions.length}
            </div>
          )}
        </div>
      )}

      {/* ── Edit Deal Log Modal ───────────────────────────────── */}
      {editLog && (
        <div className="fixed inset-0 z-50 flex items-end justify-center"
             style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
             onClick={e => { if (e.target === e.currentTarget) setEditLog(null) }}>
          <div className="w-full max-w-lg rounded-t-3xl p-6 pb-10 sc-enter"
               style={{ background: 'var(--sc-card)', color: 'var(--sc-hi)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold">Edit Deal Log</h2>
              <button onClick={() => setEditLog(null)} className="text-dim hover:text-hi w-8 h-8 flex items-center justify-center rounded-xl"
                style={{ background: 'var(--sc-well)' }}>✕</button>
            </div>
            <EditLogForm
              log={editLog}
              saving={editSaving}
              onSave={saveEdit}
              onDelete={() => { deleteLog(editLog.id); setEditLog(null) }}
              onCancel={() => setEditLog(null)}
            />
          </div>
        </div>
      )}
    </main>
  )
}
