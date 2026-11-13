'use client'
import { useState } from 'react'
import type { DealLog } from '@/lib/types'

type Outcome = DealLog['outcome']

const OUTCOMES: { value: Outcome; label: string; color: string; emoji: string }[] = [
  { value: 'closed',     label: 'Closed',     color: 'border-green-500 bg-green-900/40 text-green-300',     emoji: '✅' },
  { value: 'lost',       label: 'Lost',        color: 'border-red-500 bg-red-900/40 text-red-300',           emoji: '❌' },
  { value: 'follow_up',  label: 'Follow Up',   color: 'border-yellow-500 bg-yellow-900/40 text-yellow-300',  emoji: '🔁' },
  { value: 'no_contact', label: 'No Contact',  color: 'border-gray-600 bg-well text-lo',                     emoji: '📵' },
]

type Props = {
  assignmentId: string
  onSubmit: (data: { outcome: Outcome; notes: string; lat: number | null; lng: number | null }) => Promise<void>
  onClose: () => void
}

export default function QuickLogModal({ assignmentId, onSubmit, onClose }: Props) {
  const [outcome,    setOutcome]    = useState<Outcome | null>(null)
  const [notes,      setNotes]      = useState('')
  const [locating,   setLocating]   = useState(false)
  const [location,   setLocation]   = useState<{ lat: number; lng: number } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleLocate() {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      pos => { setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false) },
      () => setLocating(false),
      { timeout: 8000 }
    )
  }

  async function handleSubmit() {
    if (!outcome) return
    setSubmitting(true)
    await onSubmit({ outcome, notes, lat: location?.lat ?? null, lng: location?.lng ?? null })
    setSubmitting(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-card border border-rim rounded-t-2xl p-6 pb-10 space-y-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base text-hi">Log Outcome</h2>
          <button onClick={onClose} className="text-lo hover:text-hi text-xl leading-none">×</button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {OUTCOMES.map(o => (
            <button
              key={o.value}
              onClick={() => setOutcome(o.value)}
              className={`flex items-center gap-2 px-3 py-3 rounded-xl border-2 text-sm font-medium transition ${
                outcome === o.value ? o.color : 'border-rim bg-well text-lo'
              }`}
            >
              <span>{o.emoji}</span>
              {o.label}
            </button>
          ))}
        </div>

        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Notes (optional)..."
          rows={3}
          className="w-full bg-well border border-rim rounded-xl px-3 py-2.5 text-sm text-hi placeholder-dim resize-none focus:outline-none focus:border-blue-500"
        />

        <button
          onClick={handleLocate}
          disabled={locating}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs transition ${
            location
              ? 'border-green-600 text-green-400'
              : 'border-rim text-lo hover:border-rim2 hover:text-hi'
          }`}
        >
          {locating ? 'Getting location…' : location ? `📍 ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : '📍 Tag my location'}
        </button>

        <button
          onClick={handleSubmit}
          disabled={!outcome || submitting}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-well disabled:text-dim text-white font-semibold py-3 rounded-xl transition"
        >
          {submitting ? 'Saving…' : 'Save Log'}
        </button>
      </div>
    </div>
  )
}
