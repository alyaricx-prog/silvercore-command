'use client'

export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-page flex items-center justify-center px-6">
      <div className="text-center max-w-xs">
        {/* Signal icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-well border border-rim mb-6">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
            className="w-9 h-9 text-dim">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M3 3l18 18M10.584 10.587a2 2 0 002.828 2.83M7.757 7.758a6 6 0 008.485 8.485M5.636 5.636a9 9 0 0012.728 12.728" />
          </svg>
        </div>

        <h1 className="text-xl font-bold text-hi mb-2">You're offline</h1>
        <p className="text-dim text-sm leading-relaxed mb-8">
          No internet connection right now. You can still view pages you've already opened — just go back.
        </p>

        <div className="bg-card border border-rim rounded-xl p-4 text-left space-y-3 mb-8">
          <p className="text-xs text-dim uppercase tracking-widest font-medium">While you wait</p>
          {[
            'Check your cached assignments',
            'Review notes you already loaded',
            'Data will sync when you\'re back online',
          ].map((tip, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
              <p className="text-sm text-lo">{tip}</p>
            </div>
          ))}
        </div>

        <button
          onClick={() => window.history.back()}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl py-3 text-sm transition"
        >
          Go back
        </button>
      </div>
    </main>
  )
}
