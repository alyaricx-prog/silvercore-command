'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Role } from '@/lib/types'

const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
)
const ListIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
)
const BriefcaseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
)
const MapIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
  </svg>
)
const GearIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)
const ChartIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
)
const UsersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)
const TrophyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
  </svg>
)
const BellIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
)
const FolderIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h3.586a1 1 0 01.707.293L10.414 6.3A1 1 0 0011.121 6H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
  </svg>
)
const RouteIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
    <circle cx="6" cy="19" r="2" /><circle cx="18" cy="5" r="2" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 17V9a6 6 0 0112 0v8" />
  </svg>
)

type NavProps = { role: Role }
type NavLink = { href: string; label: string; icon: React.ReactNode }

export default function Nav({ role }: NavProps) {
  const path = usePathname()
  const isHost = role === 'host' || role === 'cohost'

  const links: NavLink[] = isHost
    ? [
        { href: '/dashboard',    label: 'Home',    icon: <HomeIcon /> },
        { href: '/assignments',  label: 'Assign',  icon: <ListIcon /> },
        { href: '/map',          label: 'Map',     icon: <MapIcon /> },
        { href: '/customers',    label: 'People',  icon: <UsersIcon /> },
        { href: '/intelligence', label: 'Intel',   icon: <ChartIcon /> },
        { href: '/goals',        label: 'Goals',   icon: <TrophyIcon /> },
        { href: '/reminders',    label: 'Alerts',  icon: <BellIcon /> },
        { href: '/vault',        label: 'Vault',   icon: <FolderIcon /> },
        { href: '/settings',     label: 'Settings',icon: <GearIcon /> },
      ]
    : [
        { href: '/dashboard', label: 'Home',    icon: <HomeIcon /> },
        { href: '/my-work',   label: 'My Work', icon: <BriefcaseIcon /> },
        { href: '/map',       label: 'Map',     icon: <MapIcon /> },
        { href: '/route',     label: 'Route',   icon: <RouteIcon /> },
        { href: '/customers', label: 'People',  icon: <UsersIcon /> },
        { href: '/goals',     label: 'Goals',   icon: <TrophyIcon /> },
        { href: '/reminders', label: 'Alerts',  icon: <BellIcon /> },
        { href: '/vault',     label: 'Vault',   icon: <FolderIcon /> },
        { href: '/settings',  label: 'Settings',icon: <GearIcon /> },
      ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 sc-glass border-t border-rim pb-safe">
      <div className="flex items-stretch h-[3.75rem] overflow-x-auto scrollbar-none">
        {links.map(link => {
          const active = path === link.href || path.startsWith(link.href + '/')
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex-1 min-w-[52px] flex flex-col items-center justify-center gap-0.5 relative transition-all"
            >
              {/* Active pill background */}
              {active && (
                <span
                  className="absolute inset-x-1.5 top-1.5 bottom-1.5 rounded-xl"
                  style={{ background: 'rgba(var(--sc-brand-rgb,59,130,246),0.12)' }}
                />
              )}
              <span
                className="relative z-10 transition-transform"
                style={active ? { color: 'var(--sc-brand)', transform: 'scale(1.1)' } : { color: 'var(--sc-dim)' }}
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
