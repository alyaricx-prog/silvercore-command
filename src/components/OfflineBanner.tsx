'use client'
import { useEffect, useState } from 'react'

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false)
  const [justCameBack, setJustCameBack] = useState(false)

  useEffect(() => {
    // Set initial state
    setOffline(!navigator.onLine)

    function handleOffline() {
      setOffline(true)
      setJustCameBack(false)
    }

    function handleOnline() {
      setOffline(false)
      setJustCameBack(true)
      // Hide the "back online" banner after 3 s
      setTimeout(() => setJustCameBack(false), 3000)
    }

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online',  handleOnline)
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online',  handleOnline)
    }
  }, [])

  if (!offline && !justCameBack) return null

  return (
    <div
      className={`fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-2 py-2 px-4 text-xs font-semibold text-white transition-all ${
        offline ? 'bg-red-600' : 'bg-green-600'
      }`}
    >
      {offline ? (
        <>
          <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-pulse" />
          No internet connection
        </>
      ) : (
        <>
          <span>✓</span>
          Back online
        </>
      )}
    </div>
  )
}
