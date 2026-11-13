'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Step = 'org' | 'profile' | 'done'

export default function OnboardPage() {
  const [step,     setStep]     = useState<Step>('org')
  const [userId,   setUserId]   = useState('')
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  // Org step
  const [orgName,  setOrgName]  = useState('')
  const [orgId,    setOrgId]    = useState('')

  // Profile step
  const [fullName, setFullName] = useState('')
  const [phone,    setPhone]    = useState('')

  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      // If they already have a profile, go to dashboard
      const { data: prof } = await supabase.from('profiles').select('id').eq('id', user.id).single()
      if (prof) { router.push('/dashboard'); return }

      setUserId(user.id)
      // Pre-fill name from auth metadata
      const meta = user.user_metadata as { full_name?: string }
      if (meta?.full_name) setFullName(meta.full_name)
      setLoading(false)
    }
    init()
  }, [])

  async function handleOrg(e: React.FormEvent) {
    e.preventDefault()
    if (!orgName.trim()) return
    setSaving(true); setError('')

    // Create org
    const slug = orgName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const { data: org, error: orgErr } = await supabase
      .from('organisations')
      .insert({ name: orgName.trim(), slug: `${slug}-${Date.now().toString(36)}` })
      .select().single()

    if (orgErr) { setError(orgErr.message); setSaving(false); return }
    setOrgId(org.id)
    setStep('profile')
    setSaving(false)
  }

  async function handleProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim() || !orgId) return
    setSaving(true); setError('')

    const { error: profErr } = await supabase.from('profiles').insert({
      id: userId,
      organisation_id: orgId,
      full_name: fullName.trim(),
      phone: phone.trim() || null,
      role: 'host',
      group_name: null,
      is_active: true,
    })

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
          {(['org', 'profile', 'done'] as Step[]).map((s, i) => (
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

        {/* STEP 1: Org */}
        {step === 'org' && (
          <form onSubmit={handleOrg} className="space-y-5">
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">🏢</div>
              <h1 className="text-xl font-bold text-hi">Name your organisation</h1>
              <p className="text-dim text-sm mt-1">This is what your team will see when they log in.</p>
            </div>
            <div>
              <label className="block text-xs text-lo mb-1.5">Organisation name</label>
              <input
                value={orgName} onChange={e => setOrgName(e.target.value)} required autoFocus
                placeholder="SilverCore Sales"
                className="w-full bg-well border border-rim text-hi rounded-xl px-4 py-3 text-sm placeholder-dim focus:outline-none focus:border-blue-500 transition"
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit" disabled={saving || !orgName.trim()}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-well disabled:text-dim text-white font-semibold rounded-xl py-3 text-sm transition"
            >
              {saving ? 'Creating…' : 'Next →'}
            </button>
          </form>
        )}

        {/* STEP 2: Profile */}
        {step === 'profile' && (
          <form onSubmit={handleProfile} className="space-y-5">
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">👤</div>
              <h1 className="text-xl font-bold text-hi">Your profile</h1>
              <p className="text-dim text-sm mt-1">How should your team see you?</p>
            </div>
            <div>
              <label className="block text-xs text-lo mb-1.5">Full name</label>
              <input
                value={fullName} onChange={e => setFullName(e.target.value)} required autoFocus
                placeholder="Alex Johnson"
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
              {saving ? 'Saving…' : 'Finish setup →'}
            </button>
          </form>
        )}

        {/* STEP 3: Done */}
        {step === 'done' && (
          <div className="text-center space-y-6">
            <div>
              <div className="text-5xl mb-4">🎉</div>
              <h1 className="text-2xl font-bold text-hi">You're all set!</h1>
              <p className="text-dim text-sm mt-2">Your organisation is ready. Add your team from the Assignments → Team tab.</p>
            </div>
            <div className="bg-card border border-rim rounded-xl p-4 text-left space-y-3">
              <p className="text-xs text-dim uppercase tracking-widest font-semibold">What's next</p>
              <div className="space-y-2">
                {[
                  { icon: '👥', text: 'Add team members in Assignments → Team' },
                  { icon: '📋', text: 'Create your first assignment' },
                  { icon: '📱', text: 'Install this app on your phone — tap Share → Add to Home Screen' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-lg leading-tight">{item.icon}</span>
                    <p className="text-sm text-lo leading-snug">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl py-3 text-sm transition"
            >
              Go to dashboard →
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
