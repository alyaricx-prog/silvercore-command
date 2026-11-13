'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import PageSkeleton from '@/components/Skeleton'
import type { Profile, Contract, AuditEvent, DealLog , PulseEntry, FrictionReport, TrainingNote, Announcement } from '@/lib/types'

type Tab = 'report' | 'contracts' | 'pulse' | 'friction' | 'training' | 'announce' | 'audit'

const riskColor = (r: Contract['risk_level']) =>
  r === 'low' ? 'text-green-400' : r === 'high' ? 'text-red-400' : 'text-yellow-400'

const riskBg = (r: Contract['risk_level']) =>
  r === 'low' ? 'bg-green-900/30 border-green-700/40' : r === 'high' ? 'bg-red-900/30 border-red-700/40' : 'bg-yellow-900/30 border-yellow-700/40'

function RiskMeter({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score))
  const color = pct < 35 ? '#4ade80' : pct < 65 ? '#facc15' : '#f87171'
  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-dim mb-1">
        <span>Risk Score</span><span className="font-semibold" style={{ color }}>{pct}/100</span>
      </div>
      <div className="h-2 bg-well rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

export default function IntelligencePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [tab, setTab] = useState<Tab>('report')
  const [loading, setLoading] = useState(true)

  // Report state
  const [deals, setDeals] = useState<DealLog[]>([])
  const [teamSize, setTeamSize] = useState(0)

  // Phase 8 state
  const [pulseEntries, setPulseEntries]   = useState<PulseEntry[]>([])
  const [frictions, setFrictions]         = useState<FrictionReport[]>([])
  const [trainingNotes, setTrainingNotes] = useState<TrainingNote[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [newAnnounce, setNewAnnounce]     = useState('')
  const [savingAnnounce, setSavingAnnounce] = useState(false)
  const [newTraining, setNewTraining]     = useState({ outcome_type: 'lost' as TrainingNote['outcome_type'], objection_type: '', body: '' })
  const [savingTraining, setSavingTraining] = useState(false)

  // Contracts state
  const [contracts, setContracts] = useState<Contract[]>([])
  const [showContractForm, setShowContractForm] = useState(false)
  const [contractForm, setContractForm] = useState({
    title: '', description: '', value_estimate: '', area: '',
    term_months: '', risk_level: 'moderate' as Contract['risk_level'],
    risk_factors: '', opportunities: '', eval_notes: '',
  })
  const [savingContract, setSavingContract] = useState(false)
  const [expandedContract, setExpandedContract] = useState<string | null>(null)

  // Audit state
  const [audit, setAudit] = useState<AuditEvent[]>([])

  const [msg, setMsg] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!prof || (prof.role !== 'host' && prof.role !== 'cohost')) {
        router.push('/dashboard'); return
      }
      setProfile(prof)

      const [{ data: d }, { data: t }, { data: c }, { data: a }, { data: pu }, { data: fr }, { data: tn }, { data: an }] = await Promise.all([
        supabase.from('deal_logs').select('*').eq('organisation_id', prof.organisation_id)
          .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
        supabase.from('profiles').select('id').eq('organisation_id', prof.organisation_id),
        supabase.from('contracts').select('*').eq('organisation_id', prof.organisation_id).order('created_at', { ascending: false }),
        supabase.from('audit_events').select('*').eq('organisation_id', prof.organisation_id).order('created_at', { ascending: false }).limit(50),
        supabase.from('pulse_entries').select('*').eq('organisation_id', prof.organisation_id).order('created_at', { ascending: false }).limit(100),
        supabase.from('friction_reports').select('*').eq('organisation_id', prof.organisation_id).order('created_at', { ascending: false }),
        supabase.from('training_notes').select('*').eq('organisation_id', prof.organisation_id).order('created_at', { ascending: false }),
        supabase.from('announcements').select('*').eq('organisation_id', prof.organisation_id).order('created_at', { ascending: false }),
      ])
      setDeals(d || [])
      setTeamSize((t || []).length)
      setContracts(c || [])
      setAudit(a || [])
      setPulseEntries(pu || [])
      setFrictions(fr || [])
      setTrainingNotes(tn || [])
      setAnnouncements(an || [])
      setLoading(false)
    }
    load()
  }, [])

  async function handleSaveContract(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setSavingContract(true)
    setMsg('')
    const { data: { user } } = await supabase.auth.getUser()

    // Simple rule-based risk score
    const riskMap: Record<string, number> = { low: 20, moderate: 50, high: 80 }
    const baseScore = riskMap[contractForm.risk_level] ?? 50
    const factorCount = contractForm.risk_factors.split(',').filter(s => s.trim()).length
    const riskScore = Math.min(100, baseScore + factorCount * 5)

    const payload = {
      organisation_id: profile.organisation_id,
      title: contractForm.title.trim(),
      description: contractForm.description.trim() || null,
      value_estimate: contractForm.value_estimate ? parseFloat(contractForm.value_estimate) : null,
      area: contractForm.area.trim() || null,
      term_months: contractForm.term_months ? parseInt(contractForm.term_months) : null,
      risk_level: contractForm.risk_level,
      risk_score: riskScore,
      risk_factors: contractForm.risk_factors.split(',').map(s => s.trim()).filter(Boolean),
      opportunities: contractForm.opportunities.split(',').map(s => s.trim()).filter(Boolean),
      eval_notes: contractForm.eval_notes.trim() || null,
      created_by: user!.id,
      status: 'evaluating' as const,
    }
    const { data: saved, error } = await supabase.from('contracts').insert(payload).select().single()
    if (error) { setMsg('Error: ' + error.message) }
    else {
      setContracts(prev => [saved, ...prev])
      setContractForm({ title: '', description: '', value_estimate: '', area: '', term_months: '', risk_level: 'moderate', risk_factors: '', opportunities: '', eval_notes: '' })
      setShowContractForm(false)
      setTab('contracts')
      setMsg('Contract evaluation saved.')
      // Log audit
      await supabase.from('audit_events').insert({
        organisation_id: profile.organisation_id,
        actor_id: user!.id,
        entity: 'contract',
        entity_id: saved.id,
        action: 'created',
        detail: { title: saved.title },
      })
    }
    setSavingContract(false)
  }

  async function handleContractStatus(id: string, status: Contract['status']) {
    await supabase.from('contracts').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    setContracts(prev => prev.map(c => c.id === id ? { ...c, status } : c))
  }

  if (loading) return <PageSkeleton variant="list" />

  // ── Report computed stats ──────────────────────────────────
  const closed  = deals.filter(d => d.outcome === 'closed').length
  const lost    = deals.filter(d => d.outcome === 'lost').length
  const followUp = deals.filter(d => d.outcome === 'follow_up').length
  const noContact = deals.filter(d => d.outcome === 'no_contact').length
  const closeRate = deals.length > 0 ? Math.round((closed / deals.length) * 100) : 0

  const statusColors: Record<Contract['status'], string> = {
    evaluating: 'bg-yellow-900/30 text-yellow-300',
    approved:   'bg-green-900/30 text-green-300',
    rejected:   'bg-red-900/30 text-red-300',
    signed:     'bg-blue-900/30 text-blue-300',
  }

  async function saveAnnouncement() {
    if (!profile || !newAnnounce.trim()) return
    setSavingAnnounce(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('announcements').insert({
      organisation_id: profile.organisation_id,
      created_by: user.id,
      body: newAnnounce.trim(),
      pinned: true,
    }).select().single()
    if (data) setAnnouncements(prev => [data, ...prev])
    setNewAnnounce('')
    setSavingAnnounce(false)
  }

  async function unpinAnnouncement(id: string) {
    await supabase.from('announcements').update({ pinned: false }).eq('id', id)
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, pinned: false } : a))
  }

  async function deleteAnnouncement(id: string) {
    await supabase.from('announcements').delete().eq('id', id)
    setAnnouncements(prev => prev.filter(a => a.id !== id))
  }

  async function saveTrainingNote() {
    if (!profile || !newTraining.body.trim()) return
    setSavingTraining(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('training_notes').insert({
      organisation_id: profile.organisation_id,
      created_by: user.id,
      outcome_type: newTraining.outcome_type,
      objection_type: newTraining.objection_type.trim() || null,
      body: newTraining.body.trim(),
    }).select().single()
    if (data) setTrainingNotes(prev => [data, ...prev])
    setNewTraining({ outcome_type: 'lost', objection_type: '', body: '' })
    setSavingTraining(false)
  }

  async function deleteTrainingNote(id: string) {
    await supabase.from('training_notes').delete().eq('id', id)
    setTrainingNotes(prev => prev.filter(t => t.id !== id))
  }

  async function resolveFriction(id: string) {
    await supabase.from('friction_reports').update({ resolved: true }).eq('id', id)
    setFrictions(prev => prev.map(f => f.id === id ? { ...f, resolved: true } : f))
  }

  return (
    <main className="sc-enter min-h-screen bg-page text-hi pb-28">
      <header className="px-5 pt-12 pb-4 border-b border-rim">
        <p className="text-xs text-dim uppercase tracking-widest mb-1">Intelligence</p>
        <h1 className="text-xl font-bold">Data & Reports</h1>
      </header>

      {/* Tabs — scrollable */}
      <div className="flex overflow-x-auto border-b border-rim" style={{ scrollbarWidth: 'none' }}>
        {([
          ['report',   'Report'],
          ['announce', `📢 ${announcements.filter(a=>a.pinned).length}`],
          ['pulse',    '💚 Pulse'],
          ['friction', `⚠️ ${frictions.filter(f=>!f.resolved).length}`],
          ['training', '📖 Training'],
          ['contracts',`Contracts`],
          ['audit',    'Audit'],
        ] as [Tab, string][]).map(([t, label]) => (
          <button key={t} onClick={() => { setTab(t); setMsg('') }}
            className={`shrink-0 px-4 py-3 text-sm font-medium transition whitespace-nowrap ${tab === t ? 'text-blue-400 border-b-2 border-blue-400' : 'text-dim'}`}>
            {label}
          </button>
        ))}
      </div>

      {msg && (
        <div className={`mx-5 mt-4 px-4 py-3 rounded-xl text-sm ${msg.startsWith('Error') ? 'bg-red-900/40 text-red-300' : 'bg-green-900/40 text-green-300'}`}>
          {msg}
        </div>
      )}

      {/* ── WEEKLY REPORT ── */}
      {tab === 'report' && (
        <div className="px-5 py-6 space-y-5">
          <div className="bg-card border border-rim rounded-xl p-4">
            <h2 className="text-xs text-dim uppercase tracking-widest mb-3">Last 7 Days</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total Contacts', value: deals.length, color: 'text-hi' },
                { label: 'Deals Closed',  value: closed,        color: 'text-green-400' },
                { label: 'Lost',          value: lost,          color: 'text-red-400' },
                { label: 'Follow-ups',    value: followUp,      color: 'text-yellow-400' },
                { label: 'No Contact',    value: noContact,     color: 'text-dim' },
                { label: 'Close Rate',    value: `${closeRate}%`, color: closeRate >= 50 ? 'text-green-400' : 'text-yellow-400' },
              ].map(s => (
                <div key={s.label} className="bg-well rounded-xl p-3 text-center border border-rim">
                  <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-dim mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Bar chart – outcome breakdown */}
          {deals.length > 0 && (
            <div className="bg-card border border-rim rounded-xl p-4">
              <h2 className="text-xs text-dim uppercase tracking-widest mb-3">Outcome Breakdown</h2>
              {[
                { label: 'Closed',     count: closed,    color: '#4ade80' },
                { label: 'Lost',       count: lost,      color: '#f87171' },
                { label: 'Follow-up',  count: followUp,  color: '#facc15' },
                { label: 'No Contact', count: noContact, color: '#6b7280' },
              ].map(row => (
                <div key={row.label} className="mb-2">
                  <div className="flex justify-between text-xs text-dim mb-1">
                    <span>{row.label}</span><span>{row.count}</span>
                  </div>
                  <div className="h-2 bg-well rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${deals.length > 0 ? (row.count / deals.length) * 100 : 0}%`, background: row.color }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-dim text-center">
            Showing field activity from your {teamSize} team member{teamSize !== 1 ? 's' : ''}.
          </p>

          {/* Export weekly report */}
          <div className="bg-card border border-rim rounded-xl p-4">
            <h2 className="text-xs text-dim uppercase tracking-widest mb-2">Export</h2>
            <p className="text-xs text-dim mb-3">Generate a printable HTML report for the last 7 days. Open it in your browser and use ⌘P / Print → Save as PDF.</p>
            <a
              href={`/api/weekly-report?org_id=${profile?.organisation_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition text-sm"
            >
              📊 Export Weekly Report
            </a>
          </div>
        </div>
      )}

      {/* ── CONTRACTS ── */}
      {tab === 'contracts' && (
        <div className="px-5 py-4 space-y-4">
          <button onClick={() => setShowContractForm(v => !v)}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition text-sm">
            {showContractForm ? 'Cancel' : '+ New Contract Evaluation'}
          </button>

          {showContractForm && (
            <form onSubmit={handleSaveContract} className="bg-card border border-rim rounded-xl p-4 space-y-4">
              <h3 className="font-semibold text-sm">Pre-Commitment Evaluation</h3>
              {[
                { label: 'Contract Title *', key: 'title', placeholder: 'e.g. Q1 Territory Deal — North Carlisle' },
                { label: 'Description', key: 'description', placeholder: 'What is this contract about?' },
                { label: 'Value Estimate ($)', key: 'value_estimate', placeholder: '5000', type: 'number' },
                { label: 'Sales Area / Territory', key: 'area', placeholder: 'e.g. Camp Hill North' },
                { label: 'Term (months)', key: 'term_months', placeholder: '12', type: 'number' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs text-lo mb-1 block">{f.label}</label>
                  <input
                    required={f.key === 'title'} type={f.type || 'text'}
                    value={(contractForm as any)[f.key]} placeholder={f.placeholder}
                    onChange={e => setContractForm(cf => ({ ...cf, [f.key]: e.target.value }))}
                    className="w-full bg-well border border-rim rounded-xl px-4 py-3 text-sm text-hi placeholder-dim focus:outline-none focus:border-blue-500"
                  />
                </div>
              ))}
              <div>
                <label className="text-xs text-lo mb-1 block">Risk Level</label>
                <select value={contractForm.risk_level} onChange={e => setContractForm(cf => ({ ...cf, risk_level: e.target.value as Contract['risk_level'] }))}
                  className="w-full bg-well border border-rim rounded-xl px-3 py-3 text-sm text-hi focus:outline-none focus:border-blue-500">
                  <option value="low">Low</option>
                  <option value="moderate">Moderate</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-lo mb-1 block">Risk Factors (comma-separated)</label>
                <textarea value={contractForm.risk_factors} onChange={e => setContractForm(cf => ({ ...cf, risk_factors: e.target.value }))}
                  placeholder="e.g. Competitive area, Short term, Seasonal demand"
                  rows={2}
                  className="w-full bg-well border border-rim rounded-xl px-4 py-3 text-sm text-hi placeholder-dim resize-none focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-xs text-lo mb-1 block">Opportunities (comma-separated)</label>
                <textarea value={contractForm.opportunities} onChange={e => setContractForm(cf => ({ ...cf, opportunities: e.target.value }))}
                  placeholder="e.g. High foot traffic, Established relationships, Repeat buyers"
                  rows={2}
                  className="w-full bg-well border border-rim rounded-xl px-4 py-3 text-sm text-hi placeholder-dim resize-none focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-xs text-lo mb-1 block">Evaluation Notes</label>
                <textarea value={contractForm.eval_notes} onChange={e => setContractForm(cf => ({ ...cf, eval_notes: e.target.value }))}
                  placeholder="Any additional context or decision rationale..."
                  rows={2}
                  className="w-full bg-well border border-rim rounded-xl px-4 py-3 text-sm text-hi placeholder-dim resize-none focus:outline-none focus:border-blue-500" />
              </div>
              <button type="submit" disabled={savingContract || !contractForm.title.trim()}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-well disabled:text-dim text-white font-semibold py-3 rounded-xl transition">
                {savingContract ? 'Saving…' : 'Save Evaluation'}
              </button>
            </form>
          )}

          {contracts.length === 0 && !showContractForm ? (
            <p className="text-dim text-sm text-center py-12">No contract evaluations yet.</p>
          ) : (
            contracts.map(c => (
              <div key={c.id} className={`border rounded-xl overflow-hidden ${riskBg(c.risk_level)}`}>
                <button className="w-full px-4 py-3 text-left" onClick={() => setExpandedContract(expandedContract === c.id ? null : c.id)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-hi leading-snug">{c.title}</p>
                      <p className={`text-xs font-medium mt-0.5 capitalize ${riskColor(c.risk_level)}`}>{c.risk_level} risk</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColors[c.status]}`}>{c.status}</span>
                      <span className="text-xs text-dim">{expandedContract === c.id ? '▲' : '▼'}</span>
                    </div>
                  </div>
                  {c.risk_score != null && <RiskMeter score={c.risk_score} />}
                </button>

                {expandedContract === c.id && (
                  <div className="px-4 pb-4 space-y-3 border-t border-white/5">
                    {c.value_estimate != null && (
                      <p className="text-sm text-hi mt-3">Value: <span className="font-semibold text-green-400">${c.value_estimate.toLocaleString()}</span>
                        {c.term_months ? <span className="text-dim"> · {c.term_months} mo</span> : ''}
                        {c.area ? <span className="text-dim"> · {c.area}</span> : ''}
                      </p>
                    )}
                    {c.description && <p className="text-sm text-lo">{c.description}</p>}
                    {c.risk_factors?.length > 0 && (
                      <div>
                        <p className="text-xs text-dim uppercase tracking-wider mb-1">Risk Factors</p>
                        <div className="flex flex-wrap gap-1">
                          {c.risk_factors.map((f, i) => (
                            <span key={i} className="text-xs bg-red-900/40 text-red-300 px-2 py-0.5 rounded-full">{f}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {c.opportunities?.length > 0 && (
                      <div>
                        <p className="text-xs text-dim uppercase tracking-wider mb-1">Opportunities</p>
                        <div className="flex flex-wrap gap-1">
                          {c.opportunities.map((o, i) => (
                            <span key={i} className="text-xs bg-green-900/40 text-green-300 px-2 py-0.5 rounded-full">{o}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {c.eval_notes && <p className="text-sm text-lo italic">{c.eval_notes}</p>}
                    {/* Status actions */}
                    {c.status === 'evaluating' && (
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => handleContractStatus(c.id, 'approved')}
                          className="flex-1 bg-green-700 hover:bg-green-600 text-white text-xs font-semibold py-2 rounded-lg transition">
                          Approve
                        </button>
                        <button onClick={() => handleContractStatus(c.id, 'rejected')}
                          className="flex-1 bg-red-800 hover:bg-red-700 text-white text-xs font-semibold py-2 rounded-lg transition">
                          Reject
                        </button>
                        <button onClick={() => handleContractStatus(c.id, 'signed')}
                          className="flex-1 bg-blue-700 hover:bg-blue-600 text-white text-xs font-semibold py-2 rounded-lg transition">
                          Signed
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ── AUDIT TRAIL ── */}
      {tab === 'audit' && (
        <div className="px-5 py-4 space-y-2">
          {audit.length === 0 ? (
            <p className="text-dim text-sm text-center py-12">No audit events yet.</p>
          ) : (
            audit.map(e => (
              <div key={e.id} className="bg-card border border-rim rounded-xl px-4 py-3 flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-hi capitalize">
                    {e.entity} <span className="text-dim">{e.action}</span>
                    {(e.detail as any)?.title ? <span className="text-lo"> — {(e.detail as any).title}</span> : ''}
                  </p>
                  <p className="text-xs text-dim mt-0.5">{new Date(e.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── ANNOUNCEMENTS ── */}
      {tab === 'announce' && (
        <div className="px-5 py-4 space-y-4">
          <div className="bg-card border border-rim rounded-xl p-4 space-y-3">
            <h2 className="text-xs text-dim uppercase tracking-widest">Post Announcement</h2>
            <textarea value={newAnnounce} onChange={e => setNewAnnounce(e.target.value)}
              placeholder="e.g. New pitch starts Monday. Avoid Oak Street this week."
              rows={3} className="w-full bg-well border border-rim rounded-lg px-3 py-2 text-sm text-hi placeholder-dim resize-none" />
            <button onClick={saveAnnouncement} disabled={savingAnnounce || !newAnnounce.trim()}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold py-2.5 rounded-xl transition text-sm">
              {savingAnnounce ? 'Posting…' : '📢 Post to All Reps'}
            </button>
          </div>
          {announcements.length === 0 && <p className="text-dim text-sm text-center py-8">No announcements yet.</p>}
          {announcements.map(a => (
            <div key={a.id} className={`bg-card border rounded-xl px-4 py-3 ${a.pinned ? 'border-blue-700/40' : 'border-rim opacity-60'}`}>
              <p className="text-sm text-hi leading-snug">{a.body}</p>
              <p className="text-xs text-dim mt-1">{new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              <div className="flex gap-2 mt-2">
                {a.pinned && (
                  <button onClick={() => unpinAnnouncement(a.id)}
                    className="text-xs text-dim border border-rim px-2 py-1 rounded-lg hover:text-hi transition">Unpin</button>
                )}
                <button onClick={() => deleteAnnouncement(a.id)}
                  className="text-xs text-red-400 border border-red-900/30 px-2 py-1 rounded-lg hover:bg-red-900/20 transition">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── PULSE ── */}
      {tab === 'pulse' && (
        <div className="px-5 py-4 space-y-4">
          <div className="bg-card border border-rim rounded-xl p-4">
            <h2 className="text-xs text-dim uppercase tracking-widest mb-3">Team Pulse — Last 7 Days</h2>
            {pulseEntries.length === 0 ? (
              <p className="text-dim text-sm text-center py-6">No pulse entries yet. Reps submit from their dashboard.</p>
            ) : (
              <>
                <div className="flex justify-between text-xs text-dim mb-2">
                  <span>Avg score</span>
                  <span className="font-bold text-hi">{(pulseEntries.reduce((s,p) => s + p.score, 0) / pulseEntries.length).toFixed(1)} / 5</span>
                </div>
                <div className="h-2 bg-well rounded-full mb-4">
                  <div className="h-full rounded-full bg-green-500 transition-all"
                    style={{ width: `${(pulseEntries.reduce((s,p) => s + p.score, 0) / pulseEntries.length / 5) * 100}%` }} />
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {pulseEntries.map(p => (
                    <div key={p.id} className="flex items-start gap-3 bg-well rounded-xl px-3 py-2">
                      <span className="text-lg">{p.score >= 4 ? '🟢' : p.score >= 3 ? '🟡' : '🔴'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-hi">{p.score}/5</p>
                        {p.note && <p className="text-xs text-dim truncate">{p.note}</p>}
                        <p className="text-xs text-dim mt-0.5">{new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── FRICTION REPORTS ── */}
      {tab === 'friction' && (
        <div className="px-5 py-4 space-y-3">
          {frictions.length === 0 && <p className="text-dim text-sm text-center py-12">No friction reports. Reps flag problem locations from the map.</p>}
          {frictions.map(f => (
            <div key={f.id} className={`bg-card border rounded-xl px-4 py-3 ${f.resolved ? 'border-rim opacity-50' : 'border-red-900/40'}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${f.resolved ? 'bg-gray-800 text-dim' : 'bg-red-900/40 text-red-300'}`}>
                  {f.category.replace('_', ' ').toUpperCase()}
                </span>
                <span className="text-xs text-dim">{new Date(f.created_at).toLocaleDateString()}</span>
              </div>
              {f.address && <p className="text-sm text-hi truncate">{f.address}</p>}
              {f.note && <p className="text-xs text-dim mt-1">{f.note}</p>}
              <p className="text-xs text-dim mt-1">📍 {f.lat.toFixed(4)}, {f.lng.toFixed(4)}</p>
              {!f.resolved && (
                <button onClick={() => resolveFriction(f.id)}
                  className="mt-2 text-xs text-green-400 border border-green-900/30 px-3 py-1 rounded-lg hover:bg-green-900/20 transition">
                  Mark Resolved
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── TRAINING NOTES ── */}
      {tab === 'training' && (
        <div className="px-5 py-4 space-y-4">
          <div className="bg-card border border-rim rounded-xl p-4 space-y-3">
            <h2 className="text-xs text-dim uppercase tracking-widest">Add Training Note</h2>
            <div>
              <label className="text-xs text-dim block mb-1">Outcome type</label>
              <select value={newTraining.outcome_type}
                onChange={e => setNewTraining(v => ({ ...v, outcome_type: e.target.value as TrainingNote['outcome_type'] }))}
                className="w-full bg-well border border-rim rounded-lg px-3 py-2 text-sm text-hi">
                <option value="lost">Lost</option>
                <option value="closed">Closed</option>
                <option value="follow_up">Follow Up</option>
                <option value="no_contact">No Contact</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-dim block mb-1">Objection type (optional)</label>
              <input type="text" value={newTraining.objection_type}
                onChange={e => setNewTraining(v => ({ ...v, objection_type: e.target.value }))}
                placeholder="e.g. price, competitor, not interested…"
                className="w-full bg-well border border-rim rounded-lg px-3 py-2 text-sm text-hi placeholder-dim" />
            </div>
            <div>
              <label className="text-xs text-dim block mb-1">Coaching tip</label>
              <textarea value={newTraining.body}
                onChange={e => setNewTraining(v => ({ ...v, body: e.target.value }))}
                placeholder="What should a rep do or say in this situation?"
                rows={3} className="w-full bg-well border border-rim rounded-lg px-3 py-2 text-sm text-hi placeholder-dim resize-none" />
            </div>
            <button onClick={saveTrainingNote} disabled={savingTraining || !newTraining.body.trim()}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold py-2.5 rounded-xl transition text-sm">
              {savingTraining ? 'Saving…' : '📖 Save Training Note'}
            </button>
          </div>
          {trainingNotes.length === 0 && <p className="text-dim text-sm text-center py-6">No training notes yet.</p>}
          {trainingNotes.map(n => (
            <div key={n.id} className="bg-card border border-rim rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-300 capitalize">
                  {n.outcome_type.replace('_', ' ')}
                </span>
                {n.objection_type && (
                  <span className="text-xs text-dim">· {n.objection_type}</span>
                )}
              </div>
              <p className="text-sm text-hi leading-snug mt-1">{n.body}</p>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-dim">{new Date(n.created_at).toLocaleDateString()}</p>
                <button onClick={() => deleteTrainingNote(n.id)}
                  className="text-xs text-red-400 hover:underline">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Nav role={profile!.role} />
    </main>
  )
}
