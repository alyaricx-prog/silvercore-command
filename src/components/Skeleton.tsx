type Variant = 'dashboard' | 'list' | 'settings'

function Bar({ className = '' }: { className?: string }) {
  return <div className={`sc-skeleton ${className}`} />
}

function CardSkeleton() {
  return (
    <div className="bg-card border border-rim rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <Bar className="h-4 w-1/2" />
        <Bar className="h-4 w-16" />
      </div>
      <Bar className="h-3 w-5/6" />
      <Bar className="h-3 w-1/3" />
    </div>
  )
}

/** Placeholder shown while a page loads its data, shaped like the page it replaces. */
export default function PageSkeleton({ variant = 'list' }: { variant?: Variant }) {
  return (
    <main className="min-h-screen bg-page pb-24" aria-busy="true" aria-label="Loading">
      <header className="px-5 pt-12 pb-5 space-y-2">
        <Bar className="h-3 w-24" />
        <Bar className="h-6 w-44" />
        {variant === 'dashboard' && <Bar className="h-5 w-28" />}
      </header>

      <div className="px-5 space-y-4">
        {variant === 'dashboard' && (
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="bg-card border border-rim rounded-xl p-4 flex flex-col items-center gap-2">
                <Bar className="h-7 w-8" />
                <Bar className="h-3 w-14" />
              </div>
            ))}
          </div>
        )}
        {variant === 'settings' ? (
          [0, 1, 2].map(i => (
            <div key={i} className="bg-card border border-rim rounded-2xl p-4 space-y-3">
              <Bar className="h-3 w-20" />
              <Bar className="h-11 w-full" />
              <Bar className="h-11 w-full" />
            </div>
          ))
        ) : (
          [0, 1, 2].map(i => <CardSkeleton key={i} />)
        )}
      </div>
    </main>
  )
}
