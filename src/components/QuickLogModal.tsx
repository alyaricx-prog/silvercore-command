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

const COMMON_OBJECTIONS = ['Price', 'Already have service', 'Renting / not my decision', 'Not interested', 'Competitor', 'Come back later', 'No soliciting', 'Other']

type Props = {
  assignmentId: string
  trainingNotes?: { outcome_type: string; objection_type: string | null; body: string }[]
  onSubmit: (data: { outcome: Outcome; notes: string; lat: number | null; lng: number | null; objection_type: string | null; follow_up_at: string | null }) => Promise<void>
  onClose: () => void
}

export default function QuickLogModal({ assignmentId, trainingNotes = [], onSubmit, onClose }: Props) {
  const [outcome,       setOutcome]       = useState<Outcome | null>(null)
  const [notes,         setNotes]         = useState('')
  const [objectionType, setObjectionType] = useState('')
  const [followUpDate,  setFollowUpDate]  = useState('')
  const [locating,      setLocating]      = useState(false)
  const [location,      setLocation]      = useState<{ lat: number; lng: number } | null>(null)
  const [submitting,    setSubmitting]    = useState(false)
  const [submitted,     setSubmitted]     = useState(false)
  const [tipNote,       setTipNote]       = useState<string | null>(null)

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
    await onSubmit({
      outcome,
      notes,
      lat: location?.lat ?? null,
      lng: location?.lng ?? null,
      objection_type: (outcome === 'lost' && objectionType) ? objectionType : null,
      follow_up_at: (outcome === 'follow_up' && followUpDate) ? new Date(followUpDate).toISOString() : null,
    })
    // Show matching training tip if one exists
    const match = trainingNotes.find(t =>
      t.outcome_type === outcome &&
      (!t.objection_type || t.objection_type.toLowerCase() === objectionType.toLowerCase())
    ) || trainingNotes.find(t => t.outcome_type === outcome && !t.objection_type)
    setTipNote(match?.body ?? null)
    setSubmitting(false)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
        <div className="w-full max-w-lg bg-card border border-rim rounded-t-2xl p-6 pb-10 space-y-4" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-base text-green-400">✓ Logged</h2>
            <button onClick={onClose} className="text-lo hover:text-hi text-xl leading-none">×</button>
          </div>
          {tipNote ? (
            <>
              <p className="text-xs text-dim uppercase tracking-widest">Training Tip</p>
              <div className="bg-blue-900/30 border border-blue-700/40 rounded-xl px-4 py-3">
                <p className="text-sm text-hi leading-snug">{tipNote}</p>
              </div>
            </>
          ) : (
            <p className="text-sm text-dim">No specific tip for this outcome yet — check the Intelligence tab.</p>
          )}
          <button onClick={onClose} className="w-full bg-well border border-rim text-hi font-semibold py-2.5 rounded-xl transition text-sm">
            Done
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-card border border-rim rounded-t-2xl p-6 pb-10 space-y-5 max-h-[90vh] overflow-y-auto"
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
              onClick={() => { setOutcome(o.value); setObjectionType(''); setFollowUpDate('') }}
              className={`flex items-center gap-2 px-3 py-3 rounded-xl border-2 text-sm font-medium transition ${
                outcome === o.value ? o.color : 'border-rim bg-well text-lo'
              }`}
            >
              <span>{o.emoji}</span>
              {o.label}
            </button>
          ))}
        </div>

        {outcome === 'lost' && (
          <div>
            <label className="text-xs text-dim uppercase tracking-widest block mb-2">Objection type</label>
            <div className="flex flex-wrap gap-2">
              {COMMON_OBJECTIONS.map(obj => (
                <button key={obj} onClick={() => setObjectionType(prev => prev === obj ? '' : obj)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition ${
                    objectionType === obj ? 'border-red-500 bg-red-900/40 text-red-300' : 'border-rim text-dim'
                  }`}>{obj}</button>
              ))}
            </div>
            <input type="text" value={COMMON_OBJECTIONS.includes(objectionType) ? '' : objectionType}
              onChange={e => setObjectionType(e.target.value)}
              placeholder="Or type a custom objection…"
              className="mt-2 w-full bg-well border border-rim rounded-xl px-3 py-2 text-sm text-hi placeholder-dim focus:outline-none" />
          </div>
        )}

        {outcome === 'follow_up' && (
          <div>
            <label className="text-xs text-dim uppercase tracking-widest block mb-2">Follow-up date</label>
            <input type="datetime-local" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)}
              className="w-full bg-well border border-rim rounded-xl px-3 py-2.5 text-sm text-hi focus:outline-none focus:border-blue-500" />
          </div>
        )}

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
