'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import PageSkeleton from '@/components/Skeleton'
import { useTheme, type Theme } from '@/providers/ThemeProvider'
import type { Profile } from '@/lib/types'

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
  const router                    = useRouter()
  const supabase                  = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!prof) { router.push('/auth/login'); return }
      setProfile(prof)
      setName(prof.full_name)
      setGroup(prof.group_name || '')
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

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  if (loading) return <PageSkeleton variant="settings" />

  if (!profile) return null

  return (
    <main className="sc-enter min-h-screen bg-page text-hi pb-28">
      <header className="px-5 pt-12 pb-4 border-b border-rim">
        <p className="text-xs text-dim uppercase tracking-widest mb-1">Account</p>
        <h1 className="text-xl font-bold">Settings</h1>
      </header>

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

        {/* ── App info ──────────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="text-xs font-semibold text-dim uppercase tracking-widest">About</h2>
          <div className="bg-card border border-rim rounded-2xl divide-y divide-rim">
            <Row label="App" value="SilverCore Command" />
            <Row label="Version" value="1.0.0" />
            <Row label="Build" value="Phase 4" />
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
