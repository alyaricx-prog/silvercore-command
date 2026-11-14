'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Role } from '@/lib/types'

// ── Icons ─────────────────────────────────────────────────────────────────────

const MapIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
  </svg>
)

const MissionsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const TeamIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const IntelIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
)

const MyWorkIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
)

// ── Types ──────────────────────────────────────────────────────────────────────

type NavProps = { role: Role }
type NavLink = { href: string; label: string; icon: React.ReactNode }

// ── Nav ────────────────────────────────────────────────────────────────────────

export default function Nav({ role }: NavProps) {
  const path = usePathname()
  const isHost = role === 'host' || role === 'cohost'

  /**
   * HOST: Map · Missions · Team · Intel
   * EMPLOYEE: Map · My Work · Team · Intel
   *
   * Alerts → bell in AppHeader
   * Settings → profile avatar in AppHeader
   */
  const links: NavLink[] = isHost
    ? [
        { href: '/map',         label: 'Map',      icon: <MapIcon /> },
        { href: '/missions',    label: 'Missions', icon: <MissionsIcon /> },
        { href: '/team',        label: 'Team',     icon: <TeamIcon /> },
        { href: '/intelligence',label: 'Intel',    icon: <IntelIcon /> },
      ]
    : [
        { href: '/map',         label: 'Map',      icon: <MapIcon /> },
        { href: '/my-work',     label: 'My Work',  icon: <MyWorkIcon /> },
        { href: '/team',        label: 'Team',     icon: <TeamIcon /> },
        { href: '/intelligence',label: 'Intel',    icon: <IntelIcon /> },
      ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 sc-glass border-t border-rim pb-safe">
      <div className="flex items-stretch h-[3.75rem]">
        {links.map(link => {
          // Treat /missions as active for /assignments, /goals, /simulation
          const missionsRoutes = ['/assignments', '/goals', '/simulation']
          const active =
            path === link.href ||
            path.startsWith(link.href + '/') ||
            (link.href === '/missions' && missionsRoutes.some(r => path.startsWith(r)))

          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-all"
            >
              {active && (
                <span
                  className="absolute inset-x-1.5 top-1.5 bottom-1.5 rounded-xl"
                  style={{ background: 'rgba(var(--sc-brand-rgb,59,130,246),0.12)' }}
                />
              )}
              <span
                className="relative z-10 transition-transform"
                style={active
                  ? { color: 'var(--sc-brand)', transform: 'scale(1.1)' }
                  : { color: 'var(--sc-dim)' }}
              >
                {link.icon}
              </span>
              <span
                className="relative z-10 text-[9px] font-semibold leading-none tracking-wide"
                style={active ? { color: 'var(--sc-brand)' } : { color: 'var(--sc-dim)' }}
              >
                {link.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
