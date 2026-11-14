'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
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
    <header className="sc-header-bar px-5 pt-12 pb-4 relative">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {org?.logo_url ? (
            <div className="shrink-0 w-9 h-9 rounded-xl overflow-hidden border border-rim shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={org.logo_url} alt={displayName ?? ''} className="w-full h-full object-contain bg-card" />
            </div>
          ) : displayName ? (
            <div className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white shadow-sm"
              style={{ background: 'var(--sc-brand)' }}>
              {displayName.slice(0,2).toUpperCase()}
            </div>
          ) : null}
          <div className="min-w-0">
            {displayName && (
              <p className="text-[10px] font-semibold uppercase tracking-widest truncate"
                style={{ color: 'var(--sc-brand)' }}>
                {displayName}
              </p>
            )}
            {eyebrow && !displayName && (
              <p className="text-xs text-dim uppercase tracking-widest">{eyebrow}</p>
            )}
            <h1 className="text-xl font-bold text-hi leading-tight truncate">{title}</h1>
            {subtitle && <p className="text-xs text-dim mt-0.5 truncate">{subtitle}</p>}
          </div>
        </div>
        {right && <div className="shrink-0 mt-1">{right}</div>}
      </div>
      <div className="absolute bottom-0 left-5 right-5 h-px"
        style={{ background: 'linear-gradient(90deg, var(--sc-brand) 0%, transparent 100%)', opacity: 0.35 }} />
    </header>
  )
}
