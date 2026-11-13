'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Step = 'password' | 'profile' | 'done'

export default function EmployeeOnboardPage() {
  const [step,     setStep]     = useState<Step>('password')
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  // Password step
  const [newPw,    setNewPw]    = useState('')
  const [confirm,  setConfirm]  = useState('')

  // Profile step
  const [fullName, setFullName] = useState('')
  const [phone,    setPhone]    = useState('')
  const [profile,  setProfile]  = useState<{ id: string; full_name: string; group_name: string; organisation_id: string } | null>(null)

  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: prof } = await supabase
        .from('profiles').select('id, full_name, group_name, organisation_id, onboarded')
        .eq('id', user.id).single()

      if (!prof) { router.push('/auth/login'); return }

      // If already onboarded, go to work
      if ((prof as Record<string, unknown>).onboarded) { router.push('/my-work'); return }

      setProfile(prof)
      setFullName(prof.full_name || '')
      setLoading(false)
    }
    init()
  }, [])

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPw.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (newPw !== confirm) { setError('Passwords don\'t match.'); return }
    setSaving(true); setError('')

    const { error: pwErr } = await supabase.auth.updateUser({ password: newPw })
    if (pwErr) { setError(pwErr.message); setSaving(false); return }
    setStep('profile')
    setSaving(false)
  }

  async function handleProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setSaving(true); setError('')

    const { error: profErr } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        onboarded: true,
      })
      .eq('id', profile.id)

    if (profErr) { setError(profErr.message); setSaving(false); return }
    setStep('done')
    setSaving(false)
  }

  if (loading) return (
    <main className="min-h-screen bg-page flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  return (
    <main className="min-h-screen bg-page flex items-center justify-center px-5">
      <div className="w-full max-w-sm">

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {(['password', 'profile', 'done'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step === s ? 'bg-blue-600 text-white'
                : (step === 'profile' && i === 0) || step === 'done'
                  ? 'bg-green-600 text-white' : 'bg-well text-dim'
              }`}>
                {((step === 'profile' && i === 0) || step === 'done') && i < 2 ? '✓' : i + 1}
              </div>
              {i < 2 && <div className={`w-8 h-0.5 rounded ${
                (step === 'profile' && i === 0) || step === 'done' ? 'bg-green-600' : 'bg-rim2'
              }`} />}
            </div>
          ))}
        </div>

        {/* STEP 1: Set password */}
        {step === 'password' && (
          <form onSubmit={handlePassword} className="space-y-5">
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">🔐</div>
              <h1 className="text-xl font-bold text-hi">Set your password</h1>
              <p className="text-dim text-sm mt-1">Your manager sent you a temporary password. Create your own to get started.</p>
            </div>
            <div>
              <label className="block text-xs text-lo mb-1.5">New password</label>
              <input
                type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
                required autoFocus minLength={8}
                placeholder="Min. 8 characters"
                className="w-full bg-well border border-rim text-hi rounded-xl px-4 py-3 text-sm placeholder-dim focus:outline-none focus:border-blue-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs text-lo mb-1.5">Confirm password</label>
              <input
                type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                required placeholder="Repeat password"
                className="w-full bg-well border border-rim text-hi rounded-xl px-4 py-3 text-sm placeholder-dim focus:outline-none focus:border-blue-500 transition"
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit" disabled={saving || !newPw || !confirm}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-well disabled:text-dim text-white font-semibold rounded-xl py-3 text-sm transition"
            >
              {saving ? 'Saving…' : 'Set password →'}
            </button>
          </form>
        )}

        {/* STEP 2: Confirm profile */}
        {step === 'profile' && (
          <form onSubmit={handleProfile} className="space-y-5">
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">👋</div>
              <h1 className="text-xl font-bold text-hi">Confirm your info</h1>
              <p className="text-dim text-sm mt-1">Make sure your name looks right for your team.</p>
            </div>
            {profile?.group_name && (
              <div className="bg-well border border-rim rounded-xl px-4 py-3 text-sm">
                <span className="text-dim">Group: </span>
                <span className="text-hi font-semibold">{profile.group_name}</span>
              </div>
            )}
            <div>
              <label className="block text-xs text-lo mb-1.5">Your name</label>
              <input
                value={fullName} onChange={e => setFullName(e.target.value)} required autoFocus
                placeholder="Your full name"
                className="w-full bg-well border border-rim text-hi rounded-xl px-4 py-3 text-sm placeholder-dim focus:outline-none focus:border-blue-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs text-lo mb-1.5">Phone <span className="text-dim">(optional)</span></label>
              <input
                type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="+1 555 000 0000"
                className="w-full bg-well border border-rim text-hi rounded-xl px-4 py-3 text-sm placeholder-dim focus:outline-none focus:border-blue-500 transition"
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit" disabled={saving || !fullName.trim()}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-well disabled:text-dim text-white font-semibold rounded-xl py-3 text-sm transition"
            >
              {saving ? 'Saving…' : 'All done →'}
            </button>
          </form>
        )}

        {/* STEP 3: Done */}
        {step === 'done' && (
          <div className="text-center space-y-6">
            <div>
              <div className="text-5xl mb-4">🚀</div>
              <h1 className="text-2xl font-bold text-hi">Ready to go!</h1>
              <p className="text-dim text-sm mt-2">Your account is set up. Check your assignments and get to work.</p>
            </div>
            <div className="bg-card border border-rim rounded-xl p-4 text-left space-y-2">
              <p className="text-xs text-dim uppercase tracking-widest font-semibold">Quick tips</p>
              {[
                { icon: '📋', text: 'Your assignments live in My Work' },
                { icon: '📍', text: 'Check in when you arrive at a location' },
                { icon: '📝', text: 'Log every deal — closed, lost, or follow-up' },
                { icon: '📱', text: 'Install this as an app: Share → Add to Home Screen' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 pt-1">
                  <span className="text-lg leading-tight">{item.icon}</span>
                  <p className="text-sm text-lo leading-snug">{item.text}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => router.push('/my-work')}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl py-3 text-sm transition"
            >
              See my assignments →
            </button>
          </div>
        )}

      </div>
    </main>
  )
}
