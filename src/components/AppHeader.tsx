'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useTheme } from '@/providers/ThemeProvider'
import type { Organisation } from '@/lib/types'

// ── Icons ─────────────────────────────────────────────────────────────────────

const BellIcon = ({ dot }: { dot?: boolean }) => (
  <span className="relative inline-flex">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
    {dot && (
      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 border border-black" />
    )}
  </span>
)

const SunIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
)

const MoonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
)

// ── Types ──────────────────────────────────────────────────────────────────────

type Props = {
  organisationId: string | null
  eyebrow?: string
  title: string
  subtitle?: string
  right?: React.ReactNode
  hasAlerts?: boolean
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AppHeader({
  organisationId, eyebrow, title, subtitle, right, hasAlerts = false,
}: Props) {
  const [org, setOrg] = useState<Organisation | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()
  const { resolvedTheme, setTheme } = useTheme()

  // Load org for branding
  useEffect(() => {
    if (!organisationId) return
    supabase.from('organisations').select('*').eq('id', organisationId).single()
      .then(({ data }) => { if (data) setOrg(data as Organisation) })
  }, [organisationId])

  // Apply brand colour CSS vars
  useEffect(() => {
    if (!org?.brand_color) return
    const c = org.brand_color.replace('#', '')
    const r = parseInt(c.slice(0,2),16), g = parseInt(c.slice(2,4),16), b = parseInt(c.slice(4,6),16)
    document.documentElement.style.setProperty('--sc-brand', org.brand_color)
    document.documentElement.style.setProperty('--sc-brand-rgb', `${r},${g},${b}`)
    document.documentElement.style.setProperty('--sc-brand-dim', `rgba(${r},${g},${b},0.15)`)
    document.documentElement.style.setProperty('--sc-brand-glow', `rgba(${r},${g},${b},0.25)`)
  }, [org?.brand_color])

  // Close avatar menu on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [menuOpen])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const displayName = org?.company_display_name || org?.name

  return (
    <header className="sc-header-bar px-5 pt-14 pb-5 relative">
      <div className="flex items-center justify-between gap-3">

        {/* Left: logo + title */}
        <div className="flex items-center gap-3 min-w-0">
          {org?.logo_url ? (
            <div className="shrink-0 w-10 h-10 rounded-2xl overflow-hidden border border-rim shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={org.logo_url} alt={displayName ?? ''} className="w-full h-full object-contain bg-card" />
            </div>
          ) : displayName ? (
            <div
              className="shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black text-white shadow-lg"
              style={{ background: 'var(--sc-brand)' }}
            >
              {displayName.slice(0,2).toUpperCase()}
            </div>
          ) : null}

          <div className="min-w-0">
            {displayName ? (
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5 truncate"
                style={{ color: 'var(--sc-brand)' }}>
                {displayName}
              </p>
            ) : eyebrow ? (
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5 text-dim">{eyebrow}</p>
            ) : null}
            <h1 className="text-[1.6rem] font-black text-white leading-none tracking-tight truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-dim mt-1 truncate font-medium">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Right: extra slot + bell + theme + avatar */}
        <div className="shrink-0 flex items-center gap-2">
          {right}

          {/* Alerts bell */}
          <Link
            href="/reminders"
            aria-label="Alerts"
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
            style={{ background: 'rgba(var(--sc-brand-rgb,59,130,246),0.1)', color: 'var(--sc-brand)' }}
          >
            <BellIcon dot={hasAlerts} />
          </Link>

          {/* Theme toggle */}
          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
            style={{ background: 'rgba(var(--sc-brand-rgb,59,130,246),0.1)', color: 'var(--sc-brand)' }}
          >
            {resolvedTheme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>

          {/* Profile avatar → settings menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(v => !v)}
              aria-label="Profile & settings"
              className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs text-white transition-all"
              style={{ background: 'var(--sc-brand)' }}
            >
              {displayName ? displayName.slice(0,1).toUpperCase() : '??'}
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 top-10 w-44 rounded-2xl shadow-xl border border-rim z-50 overflow-hidden"
                style={{ background: 'var(--sc-card, #111827)' }}
              >
                <Link
                  href="/settings"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-white hover:opacity-70 transition-opacity"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Settings
                </Link>
                <div className="h-px mx-3" style={{ background: 'var(--sc-rim, rgba(255,255,255,0.08))' }} />
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-red-400 hover:opacity-70 transition-opacity"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Brand accent line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{ background: 'linear-gradient(90deg, rgba(var(--sc-brand-rgb,59,130,246),0.5) 0%, transparent 70%)' }}
      />
    </header>
  )
}
