'use client'
import { useState } from 'react'

type Props = {
  assignmentTitle: string
  onSubmit: (data: { note: string; lat: number | null; lng: number | null }) => Promise<void>
  onClose: () => void
}

export default function CheckInModal({ assignmentTitle, onSubmit, onClose }: Props) {
  const [note,       setNote]       = useState('')
  const [locating,   setLocating]   = useState(false)
  const [location,   setLocation]   = useState<{ lat: number; lng: number } | null>(null)
  const [locErr,     setLocErr]     = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleLocate() {
    if (!navigator.geolocation) { setLocErr('Geolocation not supported.'); return }
    setLocating(true)
    setLocErr('')
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocating(false)
      },
      () => { setLocErr('Could not get location.'); setLocating(false) },
      { timeout: 8000 }
    )
  }

  async function handleSubmit() {
    setSubmitting(true)
    await onSubmit({ note, lat: location?.lat ?? null, lng: location?.lng ?? null })
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-base text-hi">Check In</h2>
            <p className="text-xs text-dim mt-0.5 truncate max-w-[260px]">{assignmentTitle}</p>
          </div>
          <button onClick={onClose} className="text-lo hover:text-hi text-xl leading-none">×</button>
        </div>

        {/* Location */}
        <button
          onClick={handleLocate}
          disabled={locating}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border transition text-sm ${
            location
              ? 'border-green-600 bg-green-900/20 text-green-400'
              : 'border-rim bg-well text-lo hover:border-rim2 hover:text-hi'
          }`}
        >
          {locating
            ? '⏳ Getting location…'
            : location
              ? `📍 ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
              : '📍 Tag my location'}
        </button>
        {locErr && <p className="text-xs text-red-400 -mt-3">{locErr}</p>}

        {/* Note */}
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Quick note (optional) — what's happening at this location?"
          rows={3}
          className="w-full bg-well border border-rim rounded-xl px-3 py-2.5 text-sm text-hi placeholder-dim resize-none focus:outline-none focus:border-blue-500"
        />

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-well disabled:text-dim text-white font-semibold py-3 rounded-xl transition"
        >
          {submitting ? 'Checking in…' : 'Check In'}
        </button>
      </div>
    </div>
  )
}
