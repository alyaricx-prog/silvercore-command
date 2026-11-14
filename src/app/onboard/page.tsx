'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Step = 'org' | 'industry' | 'profile' | 'done'

const INDUSTRIES = [
  { id: 'sales',      label: 'Sales',         icon: '💼', desc: 'Field sales, B2B/B2C, door-to-door' },
  { id: 'healthcare', label: 'Healthcare',     icon: '🏥', desc: 'Clinics, home care, med devices' },
  { id: 'logistics',  label: 'Logistics',      icon: '🚚', desc: 'Delivery, dispatch, supply chain' },
  { id: 'retail',     label: 'Retail',         icon: '🛍', desc: 'Stores, kiosks, field merch' },
  { id: 'tech',       label: 'Tech / SaaS',    icon: '💻', desc: 'Software, IT services, consulting' },
  { id: 'real_estate',label: 'Real Estate',    icon: '🏠', desc: 'Agents, property management' },
  { id: 'construction',label: 'Construction',  icon: '🔨', desc: 'Crews, job sites, contractors' },
  { id: 'other',      label: 'Other',          icon: '🏢', desc: 'Any business type' },
]

export default function OnboardPage() {
  const [step,     setStep]     = useState<Step>('org')
  const [userId,   setUserId]   = useState('')
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  const [orgName,  setOrgName]  = useState('')
  const [industry, setIndustry] = useState('')
  const [orgId,    setOrgId]    = useState('')
  const [fullName, setFullName] = useState('')
  const [phone,    setPhone]    = useState('')

  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data: prof } = await supabase.from('profiles').select('id').eq('id', user.id).single()
      if (prof) { router.push('/dashboard'); return }
      setUserId(user.id)
      const meta = user.user_metadata as { full_name?: string }
      if (meta?.full_name) setFullName(meta.full_name)
      setLoading(false)
    }
    init()
  }, [])

  async function handleOrg(e: React.FormEvent) {
    e.preventDefault()
    if (!orgName.trim()) return
    setStep('industry')
  }

  async function handleIndustry() {
    if (!industry) return
    setSaving(true); setError('')
    const slug = orgName.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')
    const { data: org, error: orgErr } = await supabase.from('organisations')
      .insert({ name: orgName.trim(), slug: `${slug}-${Date.now().toString(36)}` })
      .select().single()
    if (orgErr) { setError(orgErr.message); setSaving(false); return }
    // Store industry in a way that works without schema change — use company_display_name as temp carrier
    // or if the column exists in organisations, set it. Try both gracefully.
    await supabase.from('organisations').update({ company_display_name: orgName.trim() }).eq('id', org.id)
    setOrgId(org.id)
    // Store industry in localStorage for now (UI personalisation only)
    if (typeof window !== 'undefined') localStorage.setItem('sc_industry', industry)
    setStep('profile')
    setSaving(false)
  }

  async function handleProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim() || !orgId) return
    setSaving(true); setError('')
    const { error: profErr } = await supabase.from('profiles').insert({
      id: userId, organisation_id: orgId, full_name: fullName.trim(),
      phone: phone.trim() || null, role: 'host', group_name: null, is_active: true,
    })
    if (profErr) { setError(profErr.message); setSaving(false); return }
    setStep('done')
    setSaving(false)
  }

  const steps: Step[] = ['org', 'industry', 'profile', 'done']
  const stepIdx = steps.indexOf(step)

  if (loading) return <main className="min-h-screen bg-page flex items-center justify-center"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/></main>

  return (
    <main className="min-h-screen bg-page flex items-center justify-center px-5">
      <div className="w-full max-w-sm">

        {/* Step dots */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                i < stepIdx ? 'bg-green-600 text-white' : i === stepIdx ? 'bg-blue-600 text-white' : 'bg-well text-dim'
              }`}>{i < stepIdx ? '✓' : i + 1}</div>
              {i < steps.length - 1 && <div className={`w-8 h-0.5 rounded ${i < stepIdx ? 'bg-green-600' : 'bg-rim2'}`}/>}
            </div>
          ))}
        </div>

        {/* Step 1 — Org name */}
        {step === 'org' && (
          <form onSubmit={handleOrg} className="space-y-5">
            <div className="text-center mb-6"><div className="text-4xl mb-3">🏢</div>
              <h1 className="text-xl font-bold text-hi">Name your organisation</h1>
              <p className="text-dim text-sm mt-1">This is what your team will see when they log in.</p>
            </div>
            <div>
              <label className="block text-xs text-lo mb-1.5">Organisation name</label>
              <input value={orgName} onChange={e=>setOrgName(e.target.value)} required autoFocus placeholder="SilverCore Sales"
                className="w-full bg-well border border-rim text-hi rounded-xl px-4 py-3 text-sm placeholder-dim focus:outline-none focus:border-blue-500 transition"/>
            </div>
            <button type="submit" disabled={!orgName.trim()}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-well disabled:text-dim text-white font-semibold rounded-xl py-3 text-sm transition">
              Next →
            </button>
          </form>
        )}

        {/* Step 2 — Industry */}
        {step === 'industry' && (
          <div className="space-y-5">
            <div className="text-center mb-6"><div className="text-4xl mb-3">🏭</div>
              <h1 className="text-xl font-bold text-hi">What type of business?</h1>
              <p className="text-dim text-sm mt-1">We&apos;ll tailor the app vocabulary and templates for you.</p>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {INDUSTRIES.map(ind => (
                <button key={ind.id} onClick={() => setIndustry(ind.id)}
                  className={`flex flex-col items-start gap-1 p-3.5 rounded-xl border text-left transition ${
                    industry === ind.id ? 'border-blue-500 bg-blue-900/20' : 'border-rim bg-well hover:border-rim2'
                  }`}>
                  <span className="text-2xl">{ind.icon}</span>
                  <span className="text-sm font-bold text-hi">{ind.label}</span>
                  <span className="text-[10px] text-dim leading-tight">{ind.desc}</span>
                </button>
              ))}
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button onClick={handleIndustry} disabled={!industry || saving}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-well disabled:text-dim text-white font-semibold rounded-xl py-3 text-sm transition">
              {saving ? 'Creating…' : 'Next →'}
            </button>
          </div>
        )}

        {/* Step 3 — Profile */}
        {step === 'profile' && (
          <form onSubmit={handleProfile} className="space-y-5">
            <div className="text-center mb-6"><div className="text-4xl mb-3">👤</div>
              <h1 className="text-xl font-bold text-hi">Your profile</h1>
              <p className="text-dim text-sm mt-1">How should your team see you?</p>
            </div>
            <div>
              <label className="block text-xs text-lo mb-1.5">Full name</label>
              <input value={fullName} onChange={e=>setFullName(e.target.value)} required autoFocus placeholder="Alex Johnson"
                className="w-full bg-well border border-rim text-hi rounded-xl px-4 py-3 text-sm placeholder-dim focus:outline-none focus:border-blue-500 transition"/>
            </div>
            <div>
              <label className="block text-xs text-lo mb-1.5">Phone <span className="text-dim">(optional)</span></label>
              <input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+1 555 000 0000"
                className="w-full bg-well border border-rim text-hi rounded-xl px-4 py-3 text-sm placeholder-dim focus:outline-none focus:border-blue-500 transition"/>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" disabled={saving || !fullName.trim()}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-well disabled:text-dim text-white font-semibold rounded-xl py-3 text-sm transition">
              {saving ? 'Saving…' : 'Finish setup →'}
            </button>
          </form>
        )}

        {/* Step 4 — Done */}
        {step === 'done' && (
          <div className="text-center space-y-6">
            <div><div className="text-5xl mb-4">🎉</div>
              <h1 className="text-2xl font-bold text-hi">You&apos;re all set!</h1>
              <p className="text-dim text-sm mt-2">Your workspace is ready. Add your team and run your first simulation.</p>
            </div>
            <div className="bg-card border border-rim rounded-xl p-4 text-left space-y-3">
              <p className="text-xs text-dim uppercase tracking-widest font-semibold">What&apos;s next</p>
              <div className="space-y-2">
                {[
                  { icon: '👥', text: 'Add team members in Assignments → Team' },
                  { icon: '🧭', text: 'Paste a contract in Simulation to plan your first deployment' },
                  { icon: '📡', text: 'Watch events appear live in your Feed' },
                  { icon: '📱', text: 'Install this app — tap Share → Add to Home Screen' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-lg leading-tight">{item.icon}</span>
                    <p className="text-sm text-lo leading-snug">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={() => router.push('/dashboard')}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl py-3 text-sm transition">
              Go to dashboard →
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
