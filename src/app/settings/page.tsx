'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import AppHeader from '@/components/AppHeader'
import Link from 'next/link'

import PageSkeleton from '@/components/Skeleton'
import { useTheme, type Theme } from '@/providers/ThemeProvider'
import { usePushToggle } from '@/lib/usePushSubscription'
import type { Profile, Organisation } from '@/lib/types'

const THEME_OPTIONS: { value: Theme; label: string; icon: string; desc: string }[] = [
  { value: 'dark',   label: 'Dark',   icon: '🌙', desc: 'Always dark' },
  { value: 'light',  label: 'Light',  icon: '☀️', desc: 'Always light' },
  { value: 'system', label: 'System', icon: '⚙️', desc: 'Follow device' },
]

export default function SettingsPage() {
  const [profile, setProfile]     = useState<Profile | null>(null)
  const [loading, setLoading]     = useState(true)
  const [name, setName]           = useState('')
  const [group, setGroup]         = useState('')
  const [saving, setSaving]       = useState(false)
  const [msg, setMsg]             = useState('')
  const [pwForm, setPwForm]       = useState({ current: '', next: '', confirm: '' })
  const [pwSaving, setPwSaving]   = useState(false)
  const [pwMsg, setPwMsg]         = useState('')
  const { theme, setTheme }       = useTheme()
  const push                       = usePushToggle(profile?.organisation_id ?? null)
  const router                    = useRouter()
  const supabase                  = createClient()
  const [org, setOrg]             = useState<Organisation | null>(null)
  const [brandColor, setBrandColor] = useState('#3b82f6')
  const [displayName, setDisplayName] = useState('')
  const [logoFile, setLogoFile]   = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [brandSaving, setBrandSaving] = useState(false)
  const [brandMsg, setBrandMsg]   = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!prof) { router.push('/auth/login'); return }
      setProfile(prof)
      setName(prof.full_name)
      setGroup(prof.group_name || '')
      // Load org branding
      const { data: orgData } = await supabase.from('organisations').select('*').eq('id', prof.organisation_id).single()
      if (orgData) {
        setOrg(orgData as Organisation)
        setBrandColor(orgData.brand_color || '#3b82f6')
        setDisplayName(orgData.company_display_name || '')
        if (orgData.logo_url) setLogoPreview(orgData.logo_url)
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!profile || !name.trim()) return
    setSaving(true)
    setMsg('')
    const { error } = await supabase.from('profiles').update({
      full_name: name.trim(),
      group_name: group.trim() || null,
    }).eq('id', profile.id)
    if (error) setMsg('Error: ' + error.message)
    else {
      setProfile(p => p ? { ...p, full_name: name.trim(), group_name: group.trim() } : p)
      setMsg('Profile updated.')
    }
    setSaving(false)
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (pwForm.next !== pwForm.confirm) { setPwMsg('Passwords do not match.'); return }
    if (pwForm.next.length < 8) { setPwMsg('Password must be at least 8 characters.'); return }
    setPwSaving(true)
    setPwMsg('')
    const { error } = await supabase.auth.updateUser({ password: pwForm.next })
    if (error) setPwMsg('Error: ' + error.message)
    else {
      setPwMsg('Password updated.')
      setPwForm({ current: '', next: '', confirm: '' })
    }
    setPwSaving(false)
  }

  async function handleSaveBranding() {
    if (!profile || !org) return
    setBrandSaving(true); setBrandMsg('')
    let logo_url = org.logo_url
    // Upload new logo if chosen
    if (logoFile) {
      const ext = logoFile.name.split('.').pop()
      const path = `${profile.organisation_id}/logo.${ext}`
      const { error: upErr } = await supabase.storage.from('logos').upload(path, logoFile, { upsert: true })
      if (upErr) { setBrandMsg('Logo upload failed: ' + upErr.message); setBrandSaving(false); return }
      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path)
      logo_url = publicUrl
    }
    const { error } = await supabase.from('organisations').update({
      brand_color: brandColor,
      company_display_name: displayName.trim() || null,
      logo_url,
    }).eq('id', profile.organisation_id)
    if (error) { setBrandMsg('Error: ' + error.message) }
    else {
      setBrandMsg('Branding saved!')
      setOrg(o => o ? { ...o, brand_color: brandColor, company_display_name: displayName.trim() || null, logo_url: logo_url || null } : o)
      // Apply new brand color immediately
      document.documentElement.style.setProperty('--sc-brand', brandColor)
      const hex = brandColor.replace('#','')
      const r = parseInt(hex.slice(0,2),16), g = parseInt(hex.slice(2,4),16), b = parseInt(hex.slice(4,6),16)
      document.documentElement.style.setProperty('--sc-brand-rgb', `${r},${g},${b}`)
      document.documentElement.style.setProperty('--sc-brand-dim', `rgba(${r},${g},${b},0.15)`)
      document.documentElement.style.setProperty('--sc-brand-glow', `rgba(${r},${g},${b},0.25)`)
    }
    setBrandSaving(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  if (loading) return <PageSkeleton variant="settings" />

  if (!profile) return null

  return (
    <main className="sc-enter min-h-screen bg-page text-hi pb-28">
      <AppHeader organisationId={profile.organisation_id} eyebrow="Account" title="Settings" />

      <div className="px-5 py-6 space-y-8">

        {/* ── Profile ───────────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="text-xs font-semibold text-dim uppercase tracking-widest">Profile</h2>
          <form onSubmit={handleSaveProfile} className="bg-card border border-rim rounded-2xl p-4 space-y-3">
            <div>
              <label className="text-xs text-lo mb-1 block">Display name</label>
              <input
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-well border border-rim rounded-xl px-4 py-3 text-sm text-hi placeholder-dim focus:outline-none focus:border-blue-500"
              />
            </div>
            {(profile.role === 'employee') && (
              <div>
                <label className="text-xs text-lo mb-1 block">Group</label>
                <input
                  value={group}
                  onChange={e => setGroup(e.target.value)}
                  placeholder="A, B, C…"
                  className="w-full bg-well border border-rim rounded-xl px-4 py-3 text-sm text-hi placeholder-dim focus:outline-none focus:border-blue-500"
                />
              </div>
            )}
            <div className="text-xs text-lo pt-1">
              <span className="capitalize font-medium text-blue-400">{profile.role}</span>
              {profile.group_name ? ` · Group ${profile.group_name}` : ''}
            </div>
            {msg && (
              <p className={`text-xs ${msg.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>{msg}</p>
            )}
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-well disabled:text-dim text-white font-semibold py-2.5 rounded-xl text-sm transition"
            >
              {saving ? 'Saving…' : 'Save Profile'}
            </button>
          </form>
        </section>

        {/* ── Appearance ────────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="text-xs font-semibold text-dim uppercase tracking-widest">Appearance</h2>
          <div className="bg-card border border-rim rounded-2xl p-4 space-y-3">
            <p className="text-sm font-medium">Theme</p>
            <div className="grid grid-cols-3 gap-2">
              {THEME_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition ${
                    theme === opt.value
                      ? 'border-blue-500 bg-blue-600/10'
                      : 'border-rim bg-well'
                  }`}
                >
                  <span className="text-xl">{opt.icon}</span>
                  <span className={`text-xs font-medium ${theme === opt.value ? 'text-blue-400' : 'text-lo'}`}>
                    {opt.label}
                  </span>
                  <span className="text-[10px] text-dim">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── Notifications ─────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="text-xs font-semibold text-dim uppercase tracking-widest">Notifications</h2>
          <div className="bg-card border border-rim rounded-2xl p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium">Push notifications</p>
                <p className="text-xs text-dim mt-0.5">
                  {push.status === 'unsupported' && 'Not supported on this device/browser.'}
                  {push.status === 'denied' && 'Blocked — enable in your browser/phone settings.'}
                  {push.status === 'enabled' && 'New assignments and deal outcomes will alert you.'}
                  {push.status === 'disabled' && 'Get alerted on new assignments and deal outcomes.'}
                </p>
              </div>
              <button
                onClick={() => push.status === 'enabled' ? push.disable() : push.enable()}
                disabled={push.busy || push.status === 'unsupported' || push.status === 'denied'}
                className={`shrink-0 relative w-12 h-7 rounded-full transition-colors disabled:opacity-40 ${
                  push.status === 'enabled' ? 'bg-blue-600' : 'bg-rim2'
                }`}
              >
                <span
                  className="absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform shadow"
                  style={{ transform: push.status === 'enabled' ? 'translateX(20px)' : 'translateX(0)' }}
                />
              </button>
            </div>
          </div>
        </section>

        {/* ── Password ──────────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="text-xs font-semibold text-dim uppercase tracking-widest">Security</h2>
          <form onSubmit={handleChangePassword} className="bg-card border border-rim rounded-2xl p-4 space-y-3">
            <p className="text-sm font-medium">Change Password</p>
            {(['next', 'confirm'] as const).map(field => (
              <input
                key={field}
                type="password"
                required
                value={pwForm[field]}
                onChange={e => setPwForm(f => ({ ...f, [field]: e.target.value }))}
                placeholder={field === 'next' ? 'New password' : 'Confirm new password'}
                className="w-full bg-well border border-rim rounded-xl px-4 py-3 text-sm text-hi placeholder-dim focus:outline-none focus:border-blue-500"
              />
            ))}
            {pwMsg && (
              <p className={`text-xs ${pwMsg.startsWith('Error') || pwMsg.includes('match') || pwMsg.includes('least') ? 'text-red-400' : 'text-green-400'}`}>
                {pwMsg}
              </p>
            )}
            <button
              type="submit"
              disabled={pwSaving}
              className="w-full bg-well hover:bg-rim2 disabled:opacity-50 text-hi font-semibold py-2.5 rounded-xl text-sm transition border border-rim"
            >
              {pwSaving ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        </section>

        {/* ── Branding (host only) ────────────────────────────── */}
        {(profile?.role === 'host' || profile?.role === 'cohost') && (
          <section className="space-y-4">
            <h2 className="text-xs font-semibold text-dim uppercase tracking-widest">Branding</h2>
            <div className="bg-card border border-rim rounded-2xl p-4 space-y-5">

              {/* Logo upload */}
              <div>
                <label className="text-xs text-lo block mb-2">Company logo</label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl border border-rim bg-well flex items-center justify-center overflow-hidden shrink-0">
                    {logoPreview
                      ? <img src={logoPreview} alt="logo" className="w-full h-full object-contain" />
                      : <span className="text-2xl text-dim">🏢</span>
                    }
                  </div>
                  <div className="flex-1">
                    <label className="cursor-pointer inline-flex items-center gap-2 bg-well border border-rim rounded-xl px-4 py-2.5 text-sm text-hi hover:border-blue-500 transition">
                      <span>📷</span> {logoFile ? logoFile.name : 'Choose image'}
                      <input type="file" accept="image/*" className="hidden"
                        onChange={e => {
                          const f = e.target.files?.[0]
                          if (!f) return
                          setLogoFile(f)
                          setLogoPreview(URL.createObjectURL(f))
                        }} />
                    </label>
                    <p className="text-xs text-dim mt-1.5">PNG or SVG, shown on every page</p>
                  </div>
                </div>
              </div>

              {/* Display name */}
              <div>
                <label className="text-xs text-lo block mb-1.5">Company display name</label>
                <input
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder={org?.name || 'Your company name…'}
                  className="w-full bg-well border border-rim rounded-xl px-4 py-3 text-sm text-hi placeholder-dim focus:outline-none focus:border-blue-500"
                />
                <p className="text-xs text-dim mt-1.5">Shows in the header of every page</p>
              </div>

              {/* Brand color */}
              <div>
                <label className="text-xs text-lo block mb-2">Brand color</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={brandColor} onChange={e => setBrandColor(e.target.value)}
                    className="w-10 h-10 rounded-lg border border-rim bg-well cursor-pointer p-0.5" />
                  <div className="flex flex-wrap gap-2">
                    {['#3b82f6','#8b5cf6','#ec4899','#f97316','#10b981','#ef4444','#f59e0b','#06b6d4'].map(c => (
                      <button key={c} onClick={() => setBrandColor(c)}
                        className="w-7 h-7 rounded-full border-2 transition"
                        style={{ background: c, borderColor: brandColor === c ? 'white' : 'transparent' }} />
                    ))}
                  </div>
                  <span className="text-xs text-dim font-mono">{brandColor}</span>
                </div>
                {/* Live preview */}
                <div className="mt-3 flex items-center gap-3 bg-well rounded-xl px-3 py-2.5">
                  <div className="w-6 h-6 rounded-full" style={{ background: brandColor }} />
                  <span className="text-xs text-hi">Preview — navigation & accents</span>
                  <div className="ml-auto h-1.5 w-16 rounded-full" style={{ background: brandColor }} />
                </div>
              </div>

              {brandMsg && (
                <p className={`text-xs ${brandMsg.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>{brandMsg}</p>
              )}
              <button onClick={handleSaveBranding} disabled={brandSaving}
                className="w-full text-white font-semibold py-2.5 rounded-xl text-sm transition disabled:opacity-50"
                style={{ background: 'var(--sc-brand)' }}>
                {brandSaving ? 'Saving…' : '💾 Save Branding'}
              </button>
            </div>
          </section>
        )}

        {/* ── Customisation (host only) ──────────────────────── */}
        {(profile?.role === 'host' || profile?.role === 'cohost') && (
          <section className="space-y-4">
            <h2 className="text-xs font-semibold text-dim uppercase tracking-widest">Customisation</h2>
            <div className="bg-card border border-rim rounded-2xl overflow-hidden">
              <Link href="/settings/custom-fields" className="flex items-center justify-between px-4 py-3 hover:bg-well transition">
                <div>
                  <p className="text-sm font-medium text-hi">Custom Fields</p>
                  <p className="text-xs text-dim">Add fields to assignments, customers, deals</p>
                </div>
                <span className="text-dim text-sm">›</span>
              </Link>
            </div>
          </section>
        )}

                {/* ── App info ──────────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="text-xs font-semibold text-dim uppercase tracking-widest">About</h2>
          <div className="bg-card border border-rim rounded-2xl divide-y divide-rim">
            <Row label="App" value="SilverCore Command" />
            <Row label="Version" value="1.0.0" />
            <Row label="Build" value="1.0.0-beta" />
            <Row label="Platform" value="Progressive Web App" />
          </div>
        </section>

        {/* ── Sign out ──────────────────────────────────────── */}
        <button
          onClick={handleSignOut}
          className="w-full border border-red-800 text-red-400 hover:bg-red-900/20 font-semibold py-3 rounded-2xl text-sm transition"
        >
          Sign Out
        </button>

      </div>

      <Nav role={profile.role} />
    </main>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-lo">{label}</span>
      <span className="text-sm text-hi font-medium">{value}</span>
    </div>
  )
}
