'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useTheme } from '@/providers/ThemeProvider'
import type { Organisation } from '@/lib/types'

type Props = {
  organisationId: string | null
  eyebrow?: string
  title: string
  subtitle?: string
  right?: React.ReactNode
}

export default function AppHeader({ organisationId, eyebrow, title, subtitle, right }: Props) {
  const [org, setOrg] = useState<Organisation | null>(null)
  const supabase = createClient()
  const { resolvedTheme, setTheme } = useTheme()

  useEffect(() => {
    if (!organisationId) return
    supabase.from('organisations').select('*').eq('id', organisationId).single()
      .then(({ data }) => { if (data) setOrg(data as Organisation) })
  }, [organisationId])

  useEffect(() => {
    if (!org?.brand_color) return
    const c = org.brand_color.replace('#', '')
    const r = parseInt(c.slice(0,2),16), g = parseInt(c.slice(2,4),16), b = parseInt(c.slice(4,6),16)
    document.documentElement.style.setProperty('--sc-brand', org.brand_color)
    document.documentElement.style.setProperty('--sc-brand-rgb', `${r},${g},${b}`)
    document.documentElement.style.setProperty('--sc-brand-dim', `rgba(${r},${g},${b},0.15)`)
    document.documentElement.style.setProperty('--sc-brand-glow', `rgba(${r},${g},${b},0.25)`)
  }, [org?.brand_color])

  const displayName = org?.company_display_name || org?.name

  return (
    <header className="sc-header-bar px-5 pt-14 pb-5 relative">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Logo / monogram */}
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
            {/* Org name or eyebrow */}
            {displayName ? (
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5 truncate"
                style={{ color: 'var(--sc-brand)' }}>
                {displayName}
              </p>
            ) : eyebrow ? (
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5 text-dim">{eyebrow}</p>
            ) : null}

            {/* Main title — large and bold */}
            <h1 className="text-[1.6rem] font-black text-white leading-none tracking-tight truncate">
              {title}
            </h1>

            {/* Subtitle */}
            {subtitle && (
              <p className="text-xs text-dim mt-1 truncate font-medium">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          {right}
          {/* Theme toggle */}
          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
            style={{ background: 'rgba(var(--sc-brand-rgb,59,130,246),0.1)', color: 'var(--sc-brand)' }}
          >
            {resolvedTheme === 'dark' ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Accent line — brand gradient left-to-right */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{ background: 'linear-gradient(90deg, rgba(var(--sc-brand-rgb,59,130,246),0.5) 0%, transparent 70%)' }}
      />
    </header>
  )
}
